from __future__ import annotations

from typing import Annotated, Any, Iterable
from uuid import UUID
from acidwatch_api.models.datamodel import (
    AnyResult,
    ModelInfo,
    SimulationResults,
)
import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_404_NOT_FOUND
from traceback import format_exception
from pydantic import BaseModel, ConfigDict
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
    ADAPTERS,
    BaseAdapter,
    get_parameters_schema,
)
from acidwatch_api import _legacy


tracer = trace.get_tracer(__name__, tracer_provider=get_tracer_provider())

fastapi_app = fastapi.FastAPI(swagger_ui_init_oauth=swagger_ui_init_oauth_config)

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
    # Authentication disabled for development
    return None


@fastapi_app.get("/models")
def get_models() -> dict[str, Any]:
    models: list[ModelInfo] = []
    for adapter in ADAPTERS.values():
        access_error: str | None = None  # No auth in dev
        models.append(
            ModelInfo(
                access_error=access_error,
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return _legacy.model_infos_to_formconfig(models)


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
    visualizations: Iterable[AnyResult] = ()


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
                visualizations=rest,
            )
    except BaseException as exc:
        RESULTS[uuid] = exc


@fastapi_app.post("/models/{model_id}/runs")
async def run_model(
    model_id: str,
    request: RunRequest,
) -> SimulationResults:
    adapter_class = ADAPTERS[model_id]
    adapter = adapter_class(request.concs, request.settings, None)  # No auth in dev
    result = await adapter.run()
    return _legacy.result_to_simulation_results(request.concs, result)


@fastapi_app.get("/results/{result_id}")
def get_result(result_id: UUID) -> Any:
    if (result := RESULTS.get(result_id)) is None:
        raise HTTPException(HTTP_404_NOT_FOUND)
    if isinstance(result, BaseException):
        return {"error": format_exception(result)}
    return result


fastapi_app.include_router(project_endpoints.router)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app = fastapi_app
