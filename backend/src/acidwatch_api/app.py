from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import os
from typing import Any, AsyncIterator

import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi.middleware.cors import CORSMiddleware

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import get_tracer_provider

from acidwatch_api.adapters.registry import get_adapters
from acidwatch_api.database import lifespan as database_lifespan
from acidwatch_api.message_broker import create_api_transport
from acidwatch_api.settings import SETTINGS
from acidwatch_api.authentication import (
    swagger_ui_init_oauth_config,
)
from acidwatch_api.routes import router

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI) -> AsyncIterator[dict[str, Any]]:
    async with database_lifespan(app) as database_state:
        state: dict[str, Any] = dict(database_state)
        transport = None
        if SETTINGS.broker_url is not None:
            transport = create_api_transport(
                SETTINGS.broker_url,
                SETTINGS.transport_backend,
            )
            await transport.startup(list(get_adapters()))
            state["message_broker"] = transport
        try:
            yield state
        finally:
            if transport is not None:
                await transport.shutdown()

# These SDKs log routine request/response and transmission chatter at INFO,
# which is noisy in production. Keep root at INFO for app/uvicorn logs, but
# quiet these specific third-party loggers down to WARNING.
_NOISY_LOGGERS = [
    "azure.core.pipeline.policies.http_logging_policy",
    "azure.monitor.opentelemetry.exporter",
    "azure.identity",
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
)

if SETTINGS.applicationinsights_connection_string:
    configure_azure_monitor(
        connection_string=SETTINGS.applicationinsights_connection_string
    )

HTTPXClientInstrumentor().instrument()
FastAPIInstrumentor.instrument_app(fastapi_app)

origins = [
    SETTINGS.frontend_uri,
    "https://acidwatch.radix.equinor.com",
]

# Allow CORS for GitHub Codespaces if running in that environment
if codespace_name := os.environ.get("CODESPACE_NAME"):
    domain = os.environ.get(
        "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev"
    )
    origins.append(f"https://{codespace_name}-5173.{domain}")


fastapi_app.include_router(router)

# Fail if origin misconfigured
if any(origin == "*" for origin in origins):
    raise RuntimeError("Wildcard CORS origin '*' is not allowed with credentials")

app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "traceparent",
        "tracestate",
        "Request-Id",
        "Request-Context",
    ],
)
