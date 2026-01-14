from __future__ import annotations

from collections import defaultdict
import sys
from traceback import print_exception
from uuid import UUID
from acidwatch_api.database import GetDB, SessionMaker
from acidwatch_api.models.datamodel import (
    AnyPanel,
    ModelInfo,
    SimulationResult,
    ReadSimulationResult,
    RunRequest,
    CreateSimulation,
    SimulationModelInput,
)
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, ValidationError


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
from requests import session


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


async def _run_adapters(
    sessionmaker: SessionMaker,
    concentrations: dict[str, int | float],
    adapters: list[BaseAdapter],
    model_input_ids: list[UUID],
) -> None:
    for adapter, model_input_id in zip(adapters, model_input_ids):
        adapter.concentrations = concentrations
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

        result_obj = db.Result(
            model_input_id=model_input_id,
            concentrations=concs,
            panels=[p.model_dump(mode="json", by_alias=True) for p in panels],
            python_exception=None,
            error=None,
        )

        return concs
    except BaseException as exc:
        result_obj = db.Result(
            model_input_id=model_input_id,
            concentrations={},
            panels=[],
            python_exception=exc,
            error=str(exc),
        )

    finally:
        async with db.begin_session(sessionmaker) as session:
            session.add(result_obj)


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
) -> ReadSimulationResult:
    simulation = session.get_one(db.Simulation, simulation_id)

    simulation_input = CreateSimulation(
        models=[
            SimulationModelInput(model_id=mi.model_id, parameters=mi.parameters)
            for mi in simulation.model_inputs
        ],
        concentrations=simulation.concentrations,
    )

    results = [mi.result for mi in simulation.model_inputs]

    if not all(results):
        return ReadSimulationResult(
            status="pending", simulation_input=simulation_input, results=results
        )

    result_with_error = next(
        (result for result in results if result and result.error is not None), None
    )

    if result_with_error is not None:
        try:
            print_exception(result_with_error.python_exception)
        except BaseException:
            print(result_with_error.error, file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Model failed to calculate the change: {result_with_error.error}",
        )

    return ReadSimulationResult(
        status="done",
        input=simulation_input,
        results=[
            SimulationResult(
                concentrations=result.concentrations,
                panels=[AnyPanel.model_validate(panel) for panel in result.panels],
            )
            for result in results
        ],
    )


@router.post("/simulations")
async def run_simulation(
    create_simulation: CreateSimulation,
    user: OptionalCurrentUser,
    request: Request,
    session: GetDB,
) -> UUID:

    adapters = []
    for model in create_simulation.models:
        adapter_class = get_adapters()[model.model_id]

        try:
            adapter = adapter_class(
                model.parameters,
                user.jwt_token if user else None,
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

    simulation = db.Simulation(
        owner_id=UUID(user.id) if user else None,
        concentrations=create_simulation.concentrations,
        model_inputs=[
            db.ModelInput(model_id=model.model_id, parameters=model.parameters)
            for model in create_simulation.models
        ],
    )
    session.add(simulation)
    session.commit()

    await _run_adapters(
        request.state.session,
        create_simulation.concentrations,
        adapters,
        [model_input.id for model_input in simulation.model_inputs],
    )

    return simulation.id
