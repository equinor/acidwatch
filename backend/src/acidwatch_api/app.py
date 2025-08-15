from __future__ import annotations

from collections import defaultdict
from typing import Annotated, Any, Iterable
from uuid import UUID, uuid4
from acidwatch_api.models.datamodel import (
    AnyPanel,
    ModelInfo,
)
import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_404_NOT_FOUND
from traceback import format_exception, print_exception
from pydantic import BaseModel, ConfigDict, ValidationError
from pydantic.alias_generators import to_camel

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import get_tracer_provider

from acidwatch_api import configuration, project_endpoints
from acidwatch_api.authentication import (
    confidential_app,
    swagger_ui_init_oauth_config,
    get_jwt_token,
)
from acidwatch_api.models.base import (
    BaseAdapter,
    get_parameters_schema,
    get_adapters,
    InputError,
)


tracer = trace.get_tracer(__name__, tracer_provider=get_tracer_provider())

fastapi_app = fastapi.FastAPI(
    swagger_ui_init_oauth=swagger_ui_init_oauth_config, debug=True
)

if configuration.APPLICATIONINSIGHTS_CONNECTION_STRING:
    configure_azure_monitor(
        connection_string=configuration.APPLICATIONINSIGHTS_CONNECTION_STRING
    )

HTTPXClientInstrumentor().instrument()
FastAPIInstrumentor.instrument_app(fastapi_app)

origins = [
    configuration.FRONTEND_URI,
    "https://acidwatch.radix.equinor.com",
]


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


@fastapi_app.get("/models")
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
                description=adapter.description,
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return models


class RunRequest(BaseModel):
    concs: dict[str, int | float]
    settings: dict[str, bool | float | int | str]


class RunResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    initial_concentrations: dict[str, int | float]
    final_concentrations: dict[str, int | float]
    panels: Iterable[AnyPanel] = ()


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


@fastapi_app.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    request: RunRequest,
    jwt_token: Annotated[str | None, Security(get_jwt_token)],
) -> RunResponse:
    adapter_class = get_adapters()[model_id]

    try:
        adapter = adapter_class(request.concs, request.settings, jwt_token)
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


@fastapi_app.get("/results/{result_id}")
def get_result(result_id: UUID) -> Any:
    if (result := RESULTS.get(result_id)) is None:
        raise HTTPException(HTTP_404_NOT_FOUND)
    if isinstance(result, BaseException):
        return {"error": format_exception(result)}
    return result


fastapi_app.include_router(project_endpoints.router)

app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
