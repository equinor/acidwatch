from __future__ import annotations

from collections import defaultdict
import sys
from traceback import print_exception
from uuid import UUID
from acidwatch_api.database import GetDB, SessionMaker, begin_session
from acidwatch_api.models.datamodel import (
    AnyPanel,
    ChainRequest,
    ChainedRunResponse,
    ModelInfo,
    ModelInput,
    RunResponse,
    RunRequest,
)
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import ValidationError


from acidwatch_api.authentication import (
    confidential_app,
    OptionalCurrentUser,
)
from acidwatch_api.models.base import (
    BaseAdapter,
    get_parameters_schema,
    get_adapters,
    InputError,
)
import acidwatch_api.database as db


router = APIRouter()


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


@router.get("/models")
def get_models(
    user: OptionalCurrentUser,
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in get_adapters().values():
        access_error: str | None = (
            _check_auth(adapter, user.jwt_token if user else None)
            if adapter.authentication
            else None
        )
        models.append(
            ModelInfo(
                access_error=access_error,
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                category=adapter.category,
                description=adapter.description,
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return models


async def _run_adapter(
    sessionmaker: SessionMaker, adapter: BaseAdapter, simulation_id: UUID
) -> None:
    result_obj: db.Result

    try:
        result = await adapter.run()

        concs: dict[str, int | float]
        panels: list[AnyPanel] = []
        if isinstance(result, dict):
            concs = result
        else:
            concs, *panels = result

        result_obj = db.Result(
            simulation_id=simulation_id,
            concentrations=concs,
            panels=[p.model_dump(mode="json", by_alias=True) for p in panels],
            python_exception=None,
            error=None,
        )
    except BaseException as exc:
        result_obj = db.Result(
            simulation_id=simulation_id,
            concentrations={},
            panels=[],
            python_exception=exc,
            error=str(exc),
        )

    async with db.begin_session(sessionmaker) as session:
        session.add(result_obj)


@router.post("/simulations/chain")
async def create_simulation_chain(
    chain_request: ChainRequest,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
    session: GetDB,
    request: Request,
) -> UUID:
    """Create a chain of simulations and return the ID of the last one."""
    # Create System object with initial concentrations
    system = db.System(
        owner_id=UUID(user.id) if user else None,
        concentrations=chain_request.stages[0].concentrations,
    )
    session.add(system)
    session.flush()

    simulation_ids: list[UUID] = []

    for i, stage in enumerate(chain_request.stages):
        # Validate model exists
        if stage.model_id not in get_adapters():
            raise HTTPException(
                status_code=404, detail=f"Model {stage.model_id} not found"
            )

        # Create simulation record
        simulation = db.Simulation(
            owner_id=UUID(user.id) if user else None,
            model_id=stage.model_id,
            parameters=stage.parameters,
            system_id=system.id if i == 0 else None,
            parent_simulation_id=simulation_ids[-1] if i > 0 else None,
        )
        session.add(simulation)
        session.flush()

        simulation_ids.append(simulation.id)

    session.commit()

    # Execute chain in background
    background_tasks.add_task(
        _run_simulation_chain,
        request.state.session,
        simulation_ids,
        user.jwt_token if user else None,
    )

    # Return only the last ID
    return simulation_ids[-1]


async def _run_simulation_chain(
    sessionmaker: SessionMaker,
    simulation_ids: list[UUID],
    jwt_token: str | None,
) -> None:
    """Execute simulations in sequence, passing output forward."""

    for sim_id in simulation_ids:
        # Fetch simulation from database
        async with begin_session(sessionmaker) as session:
            simulation = session.get(db.Simulation, sim_id)
            if not simulation:
                return  # Simulation not found, stop chain

            model_id = simulation.model_id
            parameters = simulation.parameters

            # Get input concentrations from parent's result or from system
            if simulation.parent_simulation_id:
                # Get concentrations from parent's result
                parent_result = (
                    session.query(db.Result)
                    .filter_by(simulation_id=simulation.parent_simulation_id)
                    .one_or_none()
                )
                if not parent_result:
                    # Parent hasn't completed yet - this shouldn't happen in sequential execution
                    result_obj = db.Result(
                        simulation_id=sim_id,
                        concentrations={},
                        panels=[],
                        python_exception=None,
                        error="Parent simulation result not found",
                    )
                    session.add(result_obj)
                    return
                concentrations = parent_result.concentrations
            elif simulation.system_id:
                # Get concentrations from system
                system = session.get(db.System, simulation.system_id)
                if not system:
                    result_obj = db.Result(
                        simulation_id=sim_id,
                        concentrations={},
                        panels=[],
                        python_exception=None,
                        error="System not found",
                    )
                    session.add(result_obj)
                    return
                concentrations = system.concentrations
            else:
                # No parent and no system - error
                result_obj = db.Result(
                    simulation_id=sim_id,
                    concentrations={},
                    panels=[],
                    python_exception=None,
                    error="Simulation has no parent or system",
                )
                session.add(result_obj)
                return

        # Get adapter class and filter concentrations
        adapter_class = get_adapters().get(model_id)
        if not adapter_class:
            result_obj = db.Result(
                simulation_id=sim_id,
                concentrations={},
                panels=[],
                python_exception=None,
                error=f"Model {model_id} not found",
            )
            async with begin_session(sessionmaker) as session:
                session.add(result_obj)
            return

        # Filter to valid substances for this adapter
        filtered_concentrations = {
            k: v
            for k, v in concentrations.items()
            if k in adapter_class.valid_substances
        }

        # Create adapter with filtered concentrations
        try:
            adapter = adapter_class(
                filtered_concentrations,
                parameters,
                jwt_token,
            )
        except (InputError, ValidationError, ValueError) as exc:
            # Store validation error as result
            result_obj = db.Result(
                simulation_id=sim_id,
                concentrations={},
                panels=[],
                python_exception=exc,
                error=str(exc),
            )
            async with begin_session(sessionmaker) as session:
                session.add(result_obj)
            # Stop chain execution on validation error
            return

        # Run the adapter
        await _run_adapter(sessionmaker, adapter, sim_id)

        # Check if execution succeeded before continuing
        async with begin_session(sessionmaker) as session:
            result_obj = (
                session.query(db.Result).filter_by(simulation_id=sim_id).one_or_none()
            )
            if not result_obj or result_obj.error:
                # Stop chain if this stage failed
                return


@router.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    run_request: RunRequest,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
    session: GetDB,
    request: Request,
) -> UUID:
    """
    Run a single model simulation.

    This endpoint is kept for backward compatibility.
    Internally, it creates a single-stage chain.
    """
    # Validate adapter exists
    if model_id not in get_adapters():
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

    # Create a single-stage chain
    chain_request = ChainRequest(
        stages=[
            ModelInput(
                model_id=model_id,
                concentrations=run_request.concentrations,
                parameters=run_request.parameters,
            )
        ]
    )

    # Delegate to chain endpoint logic
    return await create_simulation_chain(
        chain_request, user, background_tasks, session, request
    )


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(
    simulation_id: UUID,
    session: GetDB,
) -> ChainedRunResponse:
    """Get result for a simulation, including its entire parent chain."""
    simulation = session.get_one(db.Simulation, simulation_id)

    # Unravel the chain by following parent links
    chain: list[db.Simulation] = []
    current_sim: db.Simulation | None = simulation

    # Walk backwards to root
    while current_sim:
        chain.append(current_sim)
        if current_sim.parent_simulation_id:
            current_sim = session.get(db.Simulation, current_sim.parent_simulation_id)
        else:
            current_sim = None

    # Reverse to get root-to-leaf order
    chain.reverse()

    # Get initial concentrations from System
    first_sim = chain[0]
    if first_sim.system_id:
        system = session.get(db.System, first_sim.system_id)
        initial_concentrations = system.concentrations if system else {}
    else:
        initial_concentrations = {}

    # Build response for each stage
    stages: list[RunResponse] = []
    overall_status: Literal["done", "pending"] = "done"

    for sim in chain:
        result = sim.result

        model_input = ModelInput(
            model_id=sim.model_id,
            concentrations=initial_concentrations,  # Always show initial concentrations from System
            parameters=sim.parameters,
        )

        if result is None:
            overall_status = "pending"
            stages.append(RunResponse(status="pending", model_input=model_input))
        elif result.error is not None:
            # Log the error but continue building the chain response
            try:
                print_exception(result.python_exception)
            except BaseException:
                print(result.error, file=sys.stderr)

            # Return a failed response for this stage
            stages.append(
                RunResponse(
                    status="failed",
                    model_input=model_input,
                    final_concentrations={},
                    panels=[],
                    error=result.error,
                )
            )
        else:
            stages.append(
                RunResponse(
                    status="done",
                    model_input=model_input,
                    final_concentrations=result.concentrations,
                    panels=result.panels,
                )
            )

    return ChainedRunResponse(status=overall_status, stages=stages)
