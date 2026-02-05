from __future__ import annotations

from collections import defaultdict
import sys
from traceback import print_exception
from typing import Annotated
from uuid import UUID
from acidwatch_api.database import GetDB, SessionMaker
from acidwatch_api.models.datamodel import (
    AnyPanel,
    ModelInfo,
    ModelInput,
    RunResponse,
    RunRequest,
)
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import ValidationError


from acidwatch_api.authentication import (
    confidential_app,
    OptionalCurrentUser,
)
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
import acidwatch_api.database as db


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


@router.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    run_request: RunRequest,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
    session: GetDB,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
    request: Request,
) -> UUID:
    adapter_class = all_adapters[model_id]

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
) -> RunResponse:
    simulation = session.get_one(db.Simulation, simulation_id)
    result = simulation.result

    model_input = ModelInput(
        model_id=simulation.model_id,
        concentrations=simulation.concentrations,
        parameters=simulation.parameters,
    )

    if result is None:
        return RunResponse(status="pending", model_input=model_input)
    elif result.error is not None:
        try:
            print_exception(result.python_exception)
        except BaseException:
            print(result.error, file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Model failed to calculate the change: {result.error}",
        )

    return RunResponse(
        status="done",
        model_input=model_input,
        final_concentrations=result.concentrations,
        panels=result.panels,
    )
