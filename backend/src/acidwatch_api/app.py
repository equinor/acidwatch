from __future__ import annotations

from typing import Annotated, Any
import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import get_tracer_provider

from acidwatch_api import configuration, project_endpoints
from acidwatch_api.authentication import (
    MSAL_CLIENT,
    SWAGGER_UI_INIT_OAUTH_CONFIG,
    get_jwt_token,
)
from acidwatch_api.models.base import ADAPTERS, BaseAdapter, get_parameters_schema


tracer = trace.get_tracer(__name__, tracer_provider=get_tracer_provider())

fastapi_app = fastapi.FastAPI(swagger_ui_init_oauth=SWAGGER_UI_INIT_OAUTH_CONFIG)

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


class ModelInfo(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    access_error: str | None
    model_id: str
    display_name: str
    valid_substances: list[str]
    parameters: dict[str, Any]


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = MSAL_CLIENT.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")


@fastapi_app.get("/models")
def get_models(
    jwt_token: str | None = Depends(get_jwt_token),
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in ADAPTERS.values():
        access_error: str | None = (
            _check_auth(adapter, jwt_token) if adapter.authentication else None
        )
        models.append(
            ModelInfo(
                access_error=access_error,
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return models


fastapi_app.include_router(project_endpoints.router)

app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
