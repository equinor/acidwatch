from __future__ import annotations
from fastapi.responses import JSONResponse

import logging

import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import get_tracer_provider

from acidwatch_api.lifecycle import lifespan
from acidwatch_api.settings import SETTINGS
from acidwatch_api.authentication import (
    swagger_ui_init_oauth_config,
)
from acidwatch_api.frontend import mount_frontend
from acidwatch_api.routes import router

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)

# These SDKs log routine request/response and transmission chatter at INFO,
# which is noisy in production. Keep root at INFO for app/uvicorn logs, but
# quiet these specific third-party loggers down to WARNING.
_NOISY_LOGGERS = [
    "azure.core.pipeline.policies.http_logging_policy",
    "azure.monitor.opentelemetry.exporter",
    "azure.identity",
    "azure.servicebus",
    "httpx",
    "httpcore",
]
for _logger_name in _NOISY_LOGGERS:
    logging.getLogger(_logger_name).setLevel(logging.WARNING)


tracer = trace.get_tracer(__name__, tracer_provider=get_tracer_provider())

fastapi_app = fastapi.FastAPI(
    title=f"AcidWatch API ({SETTINGS.acidwatch_env})",
    swagger_ui_init_oauth=swagger_ui_init_oauth_config,
    debug=not SETTINGS.is_production,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
)


@fastapi_app.get("/health", tags=["healthcheck"])
def get_health() -> JSONResponse:
    return JSONResponse({"status": "OK"})


if SETTINGS.applicationinsights_connection_string:
    configure_azure_monitor(
        connection_string=SETTINGS.applicationinsights_connection_string
    )

HTTPXClientInstrumentor().instrument()
FastAPIInstrumentor.instrument_app(fastapi_app)

fastapi_app.include_router(router, prefix="/api")

if SETTINGS.frontend_dist is not None:
    mount_frontend(fastapi_app, SETTINGS.frontend_dist, SETTINGS)

app = fastapi_app
