from __future__ import annotations

import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi.middleware.cors import CORSMiddleware

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import get_tracer_provider

from acidwatch_api.database import lifespan
from acidwatch_api.settings import SETTINGS
from acidwatch_api.authentication import (
    swagger_ui_init_oauth_config,
)
from acidwatch_api.routes import router


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


fastapi_app.include_router(router)

app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
