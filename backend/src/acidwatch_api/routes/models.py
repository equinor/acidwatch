from __future__ import annotations

import logging
from collections import defaultdict
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import TypeAdapter, ValidationError

import acidwatch_api.database as db
from acidwatch_api.authentication import (
    OptionalCurrentUser,
    confidential_app,
)
from acidwatch_api.database import GetDB, SessionMaker
from acidwatch_api.models.datamodel import (
    AnyPanel,
    Conditions,
    ModelInfo,
    ModelInput,
    ModelResult,
    Phase,
    Simulation,
    SimulationResult,
)
from fastapi import Depends


from acidwatch_api.models import (
    ArcsAdapter,
    ArcsExpAdapter,
    BaseAdapter,
    GibbsMinimizationModelAdapter,
    PhpitzReactiveAdapter,
    PhpitzSolubilityAdapter,
    SolubilityCCSAdapter,
    TocomoAdapter,
    get_parameters_schema,
    InputError,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


router = APIRouter()

logger = logging.getLogger(__name__)


type AdapterSet = dict[str, type[BaseAdapter]]


def get_adapters() -> AdapterSet:
    return {
        adapter.model_id: adapter
        for adapter in (
            TocomoAdapter,
            ArcsAdapter,
            ArcsExpAdapter,
            SolubilityCCSAdapter,
            GibbsMinimizationModelAdapter,
            PhpitzReactiveAdapter,
            PhpitzSolubilityAdapter,
        )
    }


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


def build_adapters(
    models: list[ModelInput],
    conditions: Conditions,
    all_adapters: AdapterSet,
    jwt_token: str | None,
) -> list[BaseAdapter]:
    """Instantiate and validate the adapter chain for a set of model inputs.

    Raises:
        HTTPException: 422 if a model is unknown or its parameters are invalid.
    """
    adapters: list[BaseAdapter] = []
    for model in models:
        adapter_class = all_adapters.get(model.model_id)
        if adapter_class is None:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown model '{model.model_id}'",
            )
        try:
            adapter = adapter_class(
                parameters=model.parameters,
                conditions=conditions,
                jwt_token=jwt_token,
            )
            adapters.append(adapter)
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
    return adapters


def build_model_input_rows(models: list[ModelInput]) -> list[db.ModelInput]:
    """Build the chained ``db.ModelInput`` rows for a simulation."""
    rows: list[db.ModelInput] = []
    previous_model_input_id: UUID | None = None
    for model in models:
        model_input_id = uuid4()
        rows.append(
            db.ModelInput(
                id=model_input_id,
                previous_model_input_id=previous_model_input_id,
                model_id=model.model_id,
                parameters=model.parameters,
            )
        )
        previous_model_input_id = model_input_id
    return rows


def order_chain(
    rows: list[tuple[db.ModelInput, db.ModelResult | None]],
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    """Order ``(model_input, result)`` rows following the pipeline chain."""
    mapping: dict[UUID | None, UUID] = {}
    rows_by_id: dict[UUID, tuple[db.ModelInput, db.ModelResult | None]] = {}
    for model_input, result in rows:
        mapping[model_input.previous_model_input_id] = model_input.id
        rows_by_id[model_input.id] = (model_input, result)

    ordered: list[tuple[db.ModelInput, db.ModelResult | None]] = []
    current_id: UUID | None = mapping.get(None)
    while current_id in rows_by_id:
        assert current_id is not None
        ordered.append(rows_by_id[current_id])
        current_id = mapping.get(current_id)
    return ordered


def query_chain_rows(
    session: Session, simulation_id: UUID
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    q = (
        select(db.ModelInput, db.ModelResult)
        .where(db.ModelInput.simulation_id == simulation_id)
        .outerjoin(db.ModelResult)
    )
    return [(row[0], row[1]) for row in session.execute(q).fetchall()]


@router.get("/models")
def get_models(
    user: OptionalCurrentUser, adapters: Annotated[AdapterSet, Depends(get_adapters)]
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in adapters.values():
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


def _phases_to_concentrations(phases: list[Phase]) -> dict[str, int | float]:
    merged: dict[str, int | float] = {}
    for phase in phases:
        if phase.kind == "co2-rich":
            merged.update(phase.concentrations)
    return merged


async def run_adapters(
    sessionmaker: SessionMaker,
    concentrations: dict[str, int | float],
    adapters: list[BaseAdapter],
    model_input_ids: list[UUID],
) -> None:
    for adapter, model_input_id in zip(adapters, model_input_ids):
        adapter.set_concentrations(concentrations)
        concentrations = await _run_adapter(
            sessionmaker,
            adapter,
            model_input_id,
        )


async def _run_adapter(
    sessionmaker: SessionMaker, adapter: BaseAdapter, model_input_id: UUID
) -> dict[str, int | float]:
    try:
        result = await adapter.run()

        phases: list[Phase]
        panels: list[AnyPanel] = []
        if isinstance(result, list):
            phases = result
        else:
            phases, *panels = result

        phases = adapter.merge_passthrough(phases)

        result_obj = db.ModelResult(
            model_input_id=model_input_id,
            phases=[p.model_dump() for p in phases],
            panels=[p.model_dump(mode="json", by_alias=True) for p in panels],
            error=None,
        )

        return _phases_to_concentrations(phases)
    except BaseException as exc:
        # Full traceback goes to logs (App Insights); only a short message
        # is persisted for surfacing to the API caller.
        logger.exception(
            "Adapter %s failed for model_input %s",
            adapter.model_id,
            model_input_id,
        )
        result_obj = db.ModelResult(
            model_input_id=model_input_id,
            phases=[],
            panels=[],
            error=f"{type(exc).__name__}: {exc}",
        )
        return {}

    finally:
        async with db.begin_session(sessionmaker) as session:
            session.add(result_obj)


def build_simulation_result(session: Session, simulation_id: UUID) -> SimulationResult:
    db_simulation = session.get_one(db.Simulation, simulation_id)

    model_inputs: list[ModelInput] = []
    results: list[ModelResult] = []
    pending = False

    for model_input, result in order_chain(query_chain_rows(session, simulation_id)):
        model_inputs.append(
            ModelInput(
                model_id=model_input.model_id,
                parameters=model_input.parameters,
            )
        )

        if not result:
            pending = True
            continue

        if result.error is not None:
            logger.error("Simulation %s failed: %s", simulation_id, result.error)
            return SimulationResult(
                status="error",
                input=Simulation(
                    concentrations=_phases_to_concentrations(
                        [Phase(**p) for p in db_simulation.phases]
                    ),
                    conditions=Conditions(**(db_simulation.conditions or {})),
                    models=model_inputs,
                ),
                results=results,
                error=result.error,
            )

        results.append(
            ModelResult(
                phases=[Phase(**p) for p in result.phases],
                panels=result.panels,
            )
        )

    simulation_input = Simulation(
        concentrations=_phases_to_concentrations(
            [Phase(**p) for p in db_simulation.phases]
        ),
        conditions=Conditions(**(db_simulation.conditions or {})),
        models=model_inputs,
    )

    if pending:
        return SimulationResult(
            status="pending", input=simulation_input, results=results
        )

    return SimulationResult(
        status="done",
        input=simulation_input,
        results=[
            ModelResult(
                phases=result.phases,
                panels=[
                    TypeAdapter(AnyPanel).validate_python(panel)
                    for panel in result.panels
                ],
            )
            for result in results
            if result is not None
        ],
    )


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(
    simulation_id: UUID,
    session: GetDB,
) -> SimulationResult:
    return build_simulation_result(session, simulation_id)


@router.post("/simulations")
async def run_simulation(
    create_simulation: Simulation,
    user: OptionalCurrentUser,
    request: Request,
    session: GetDB,
    background_tasks: BackgroundTasks,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
) -> UUID:
    adapters = build_adapters(
        create_simulation.models,
        create_simulation.conditions,
        all_adapters,
        user.jwt_token if user else None,
    )

    concentrations = create_simulation.concentrations
    try:
        adapters[0].validate_concentrations(concentrations)
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    model_inputs = build_model_input_rows(create_simulation.models)

    simulation = db.Simulation(
        owner_id=UUID(user.id) if user else None,
        phases=[p.model_dump() for p in create_simulation.phases],
        conditions=create_simulation.conditions.model_dump(),
        model_inputs=model_inputs,
    )
    session.add(simulation)
    session.commit()

    background_tasks.add_task(
        run_adapters,
        request.state.session,
        concentrations,
        adapters,
        [model_input.id for model_input in simulation.model_inputs],
    )

    return simulation.id
