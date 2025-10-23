from __future__ import annotations

from collections import defaultdict
from uuid import UUID, uuid4
from acidwatch_api.models.datamodel import (
    ModelInfo,
    ModelInput,
    RunResponse,
    RunRequest,
)
from fastapi import APIRouter, BackgroundTasks, HTTPException
from traceback import format_exception, print_exception
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


SIMULATIONS: dict[UUID, ModelInput] = {}
RESULTS: dict[UUID, RunResponse | BaseException] = {}


async def _run_adapter(adapter: BaseAdapter, uuid: UUID) -> None:
    try:
        result = await adapter.run()

        if isinstance(result, dict):
            RESULTS[uuid] = RunResponse(
                model_input=SIMULATIONS[uuid],
                status="done",
                final_concentrations=result,
            )
        else:
            concs, *rest = result
            RESULTS[uuid] = RunResponse(
                model_input=SIMULATIONS[uuid],
                status="done",
                final_concentrations=concs,
                panels=rest,
            )
    except BaseException as exc:
        RESULTS[uuid] = exc


@router.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    request: RunRequest,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
) -> UUID:
    adapter_class = get_adapters()[model_id]

    try:
        adapter = adapter_class(
            request.concentrations,
            request.parameters,
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

    simulation_id = uuid4()
    SIMULATIONS[simulation_id] = ModelInput(
        model_id=model_id,
        concentrations=request.concentrations,
        parameters=request.parameters,
    )
    background_tasks.add_task(_run_adapter, adapter, simulation_id)

    return simulation_id


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(simulation_id: UUID) -> RunResponse:
    model_input = SIMULATIONS[simulation_id]
    result = RESULTS.get(simulation_id)

    if result is None:
        return RunResponse(status="pending", model_input=model_input)
    elif isinstance(result, ValueError):
        raise HTTPException(status_code=422, detail=format_exception(result))
    elif isinstance(result, BaseException):
        print_exception(result)
        raise HTTPException(
            status_code=500,
            detail=f"Model failed to calculate the change: {format_exception(result)}",
        )
    return result
