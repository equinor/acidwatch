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
    simulation_ids: list[UUID] = []

    for i, stage in enumerate(chain_request.stages):
        # Validate model exists
        if stage.model_id not in get_adapters():
            raise HTTPException(status_code=404, detail=f"Model {stage.model_id} not found")

        # Create simulation record
        simulation = db.Simulation(
            owner_id=UUID(user.id) if user else None,
            model_id=stage.model_id,
            concentrations=stage.concentrations if i == 0 else {},
            parameters=stage.parameters,
            parent_simulation_id=simulation_ids[-1] if i > 0 else None,
        )
        session.add(simulation)
        session.flush()

        simulation_ids.append(simulation.id)

    session.commit()

    # Execute chain in background
    background_tasks.add_task(
        _run_simulation_chain, request.state.session, simulation_ids, user.jwt_token if user else None
    )

    # Return only the last ID
    return simulation_ids[-1]


async def _run_simulation_chain(
    sessionmaker: SessionMaker,
    simulation_ids: list[UUID],
    jwt_token: str | None,
) -> None:
    """Execute simulations in sequence, passing output forward."""
    previous_output: dict[str, int | float] | None = None

    for sim_id in simulation_ids:
        # Fetch simulation from database
        async with begin_session(sessionmaker) as session:
            simulation = session.get(db.Simulation, sim_id)
            if not simulation:
                return  # Simulation not found, stop chain
            
            model_id = simulation.model_id
            parameters = simulation.parameters
            concentrations = simulation.concentrations

        # Update concentrations from previous stage output
        if previous_output:
            adapter_class = get_adapters().get(model_id)
            if not adapter_class:
                # Model not found - store error
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
            filtered = {
                k: v
                for k, v in previous_output.items()
                if k in adapter_class.valid_substances
            }
            
            # Update simulation with filtered concentrations
            async with begin_session(sessionmaker) as session:
                simulation = session.get(db.Simulation, sim_id)
                if simulation:
                    simulation.concentrations = filtered
                    concentrations = filtered

        # Create adapter with actual concentrations
        adapter_class = get_adapters().get(model_id)
        if not adapter_class:
            # Model not found - store error
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

        try:
            adapter = adapter_class(
                concentrations,
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

        # Get output for next stage
        async with begin_session(sessionmaker) as session:
            result_obj = (
                session.query(db.Result).filter_by(simulation_id=sim_id).one_or_none()
            )
            if result_obj and not result_obj.error:
                previous_output = result_obj.concentrations
            else:
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
    adapter_class = get_adapters()[model_id]

    try:
        adapter = adapter_class(
            run_request.concentrations,
            run_request.parameters,
            user.jwt_token if user else None,
        )
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)
    except ValidationError as exc:
        detail = defaultdict(list)
        for err in exc.errors():
            for loc in err["loc"]:
                detail[loc].append(err["msg"])

        raise HTTPException(status_code=422, detail=dict(detail))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=exc.args)

    simulation = db.Simulation(
        owner_id=UUID(user.id) if user else None,
        model_id=model_id,
        concentrations=run_request.concentrations,
        parameters=run_request.parameters,
    )
    session.add(simulation)
    session.commit()

    background_tasks.add_task(
        _run_adapter, request.state.session, adapter, simulation.id
    )

    return simulation.id


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

    # Build response for each stage
    stages: list[RunResponse] = []
    overall_status: Literal["done", "pending"] = "done"

    for sim in chain:
        result = sim.result

        model_input = ModelInput(
            model_id=sim.model_id,
            concentrations=sim.concentrations,
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

    return ChainedRunResponse(status=overall_status, stages=stages)
