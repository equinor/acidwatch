from __future__ import annotations

import sys
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
    ModelInfo,
    ModelInput,
    ModelResult,
    Simulation,
    SimulationResult,
)
from fastapi import Depends


from acidwatch_api.models import (
    ArcsAdapter,
    BaseAdapter,
    GibbsMinimizationModelAdapter,
    PhpitzAdapter,
    SolubilityCCSAdapter,
    TocomoAdapter,
    get_parameters_schema,
    InputError,
)
from sqlalchemy import select


router = APIRouter()


type AdapterSet = dict[str, type[BaseAdapter]]


def get_adapters() -> AdapterSet:
    return {
        adapter.model_id: adapter
        for adapter in (
            TocomoAdapter,
            ArcsAdapter,
            SolubilityCCSAdapter,
            GibbsMinimizationModelAdapter,
            PhpitzAdapter,
        )
    }


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


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


async def _run_adapters(
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

        concs: dict[str, int | float]
        panels: list[AnyPanel] = []
        if isinstance(result, dict):
            concs = result
        else:
            concs, *panels = result

        result_obj = db.ModelResult(
            model_input_id=model_input_id,
            concentrations=concs,
            panels=[p.model_dump(mode="json", by_alias=True) for p in panels],
            python_exception=None,
            error=None,
        )

        return concs
    except BaseException as exc:
        result_obj = db.ModelResult(
            model_input_id=model_input_id,
            concentrations={},
            panels=[],
            python_exception=exc,
            error=str(exc),
        )
        return {}

    finally:
        async with db.begin_session(sessionmaker) as session:
            session.add(result_obj)


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(
    simulation_id: UUID,
    session: GetDB,
) -> SimulationResult:
    db_simulation = session.get_one(db.Simulation, simulation_id)
    q = (
        select(db.ModelInput, db.ModelResult)
        .where(db.ModelInput.simulation_id == simulation_id)
        .outerjoin(db.ModelResult)
    )

    model_inputs: list[ModelInput] = []
    results: list[ModelResult] = []
    pending = False

    mapping: dict[UUID | None, UUID] = {}
    rows_by_id: dict[UUID, tuple[db.ModelInput, db.ModelResult]] = {}

    for model_input, result in session.execute(q).fetchall():
        mapping[model_input.previous_model_input_id] = model_input.id
        rows_by_id[model_input.id] = (model_input, result)

    current_id: UUID | None = mapping[None]
    while current_id in rows_by_id:
        assert current_id is not None
        model_input, result = rows_by_id[current_id]
        current_id = mapping.get(current_id)

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
            print(result.error, file=sys.stderr)
            raise HTTPException(
                status_code=500,
                detail=f"Simulation encountered an error: {result.error}",
            )

        results.append(
            ModelResult(
                concentrations=result.concentrations,
                panels=result.panels,
            )
        )

    simulation_input = Simulation(
        concentrations=db_simulation.concentrations,
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
                concentrations=result.concentrations,
                panels=[
                    TypeAdapter(AnyPanel).validate_python(panel)
                    for panel in result.panels
                ],
            )
            for result in results
            if result is not None
        ],
    )


@router.post("/simulations")
async def run_simulation(
    create_simulation: Simulation,
    user: OptionalCurrentUser,
    request: Request,
    session: GetDB,
    background_tasks: BackgroundTasks,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
) -> UUID:
    adapters = []
    for model in create_simulation.models:
        adapter_class = all_adapters[model.model_id]
        try:
            adapter = adapter_class(
                parameters=model.parameters,
                jwt_token=user.jwt_token if user else None,
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

    try:
        adapters[0].validate_concentrations(create_simulation.concentrations)
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    model_inputs: list[db.ModelInput] = []
    previous_model_input_id: UUID | None = None
    for model in create_simulation.models:
        model_input_id = uuid4()
        model_inputs.append(
            db.ModelInput(
                id=model_input_id,
                previous_model_input_id=previous_model_input_id,
                model_id=model.model_id,
                parameters=model.parameters,
            )
        )
        previous_model_input_id = model_input_id

    simulation = db.Simulation(
        owner_id=UUID(user.id) if user else None,
        concentrations=create_simulation.concentrations,
        model_inputs=model_inputs,
    )
    session.add(simulation)
    session.commit()
    try:
        background_tasks.add_task(
            _run_adapters,
            request.state.session,
            create_simulation.concentrations,
            adapters,
            [model_input.id for model_input in simulation.model_inputs],
        )
    except BaseException as e:
        raise e

    return simulation.id
