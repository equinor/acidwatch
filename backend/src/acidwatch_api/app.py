from typing import Any
import fastapi
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

from opentelemetry.trace import get_tracer_provider
from pydantic import BaseModel

from acidwatch_api import configuration, project_endpoints
from acidwatch_api.authentication import (
    is_user_authenticated,
    swagger_ui_init_oauth_config,
)
from acidwatch_api.models import AVAILABLE_MODELS
from acidwatch_api.models.model_config import get_model_config


tracer = trace.get_tracer(__name__, tracer_provider=get_tracer_provider())

fastapi_app = fastapi.FastAPI()
fastapi_app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

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


class Model(BaseModel):
    name: configuration.MODEL_TYPE


# Modify the get_models endpoint to check for user authentication
@fastapi_app.get("/models")
def get_models(
    user: bool = Depends(is_user_authenticated),
) -> dict[str, Any]:
    # Call get_model_config with user, which can be None if not authenticated
    model_config = get_model_config(user)

    return model_config


# Include routers for each available model
for model in AVAILABLE_MODELS:
    fastapi_app.include_router(model.router, prefix=f"/models/{model.MODEL.value}")

# Include project endpoints router
fastapi_app.include_router(project_endpoints.router)

# Apply CORS middleware to the FastAPI application
app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
