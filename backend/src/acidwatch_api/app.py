from typing import Any

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from acidwatch_api import configuration, project_endpoints
from acidwatch_api.authentication import (
    authenticated_user_claims,
    swagger_ui_init_oauth_config,
)

from acidwatch_api.models import AVAILABLE_MODELS
from acidwatch_api.models.model_config import get_model_config

fastapi_app = fastapi.FastAPI(dependencies=[fastapi.Depends(authenticated_user_claims)])
fastapi_app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "https://frontend-acidwatch-dev.radix.equinor.com",
    "https://frontend-acidwatch-prod.radix.equinor.com",
    "https://acidwatch.radix.equinor.com",
]


class Model(BaseModel):
    name: configuration.MODEL_TYPE


@fastapi_app.get("/models")
def get_models() -> dict[str, Any]:
    return get_model_config()


for model in AVAILABLE_MODELS:
    fastapi_app.include_router(model.router, prefix=f"/models/{model.MODEL.value}")


fastapi_app.include_router(project_endpoints.router)


# We wrap the FastAPI in CORSMiddleware so that CORS is applied even to
# unhandled exceptions
# https://github.com/fastapi/fastapi/discussions/8027
app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
