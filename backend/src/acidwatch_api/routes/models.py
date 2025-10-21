from __future__ import annotations

from collections import defaultdict
from typing import Annotated
from uuid import UUID, uuid4
from acidwatch_api.models.datamodel import (
    ModelInfo,
    RunResponse,
    RunRequest,
)
from fastapi import APIRouter, Depends, HTTPException, Security
from traceback import format_exception, print_exception
from pydantic import ValidationError


from acidwatch_api.authentication import (
    confidential_app,
    get_jwt_token,
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
    jwt_token: str | None = Depends(get_jwt_token),
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in get_adapters().values():
        access_error: str | None = (
            _check_auth(adapter, jwt_token) if adapter.authentication else None
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


RESULTS: dict[UUID, RunResponse | BaseException] = {}


async def _run_adapter(adapter: BaseAdapter, uuid: UUID) -> None:
    try:
        init_concs = dict(adapter.concentrations)
        result = await adapter.run()

        if isinstance(result, dict):
            RESULTS[uuid] = RunResponse(
                initial_concentrations=init_concs, final_concentrations=result
            )
        else:
            concs, *rest = result
            RESULTS[uuid] = RunResponse(
                initial_concentrations=init_concs,
                final_concentrations=concs,
                panels=rest,
            )
    except BaseException as exc:
        RESULTS[uuid] = exc


@router.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    request: RunRequest,
    jwt_token: Annotated[str | None, Security(get_jwt_token)],
) -> RunResponse:
    adapter_class = get_adapters()[model_id]

    try:
        adapter = adapter_class(
            request.concentrations,
            request.parameters,
            jwt_token,
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

    runid = uuid4()
    await _run_adapter(adapter, runid)
    result = RESULTS[runid]

    if isinstance(result, ValueError):
        raise HTTPException(status_code=422, detail=format_exception(result))
    elif isinstance(result, BaseException):
        print_exception(result)
        raise HTTPException(
            status_code=500,
            detail=f"Model failed to calculate the change: {format_exception(result)}",
        )
    return result
