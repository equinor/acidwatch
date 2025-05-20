from typing import Any

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from acidwatch_api import configuration, authentication, db_client, project_endpoints
from acidwatch_api.authentication import (
    authenticated_user_claims,
    swagger_ui_init_oauth_config,
    oauth2_scheme,
)

from acidwatch_api.models import AVAILABLE_MODELS
from acidwatch_api.models.model_config import get_model_config

app = fastapi.FastAPI()
# app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "https://frontend-acidwatch-dev.radix.equinor.com",
    "https://frontend-acidwatch-prod.radix.equinor.com",
    "https://acidwatch.radix.equinor.com",
    "http://localhost:8001",
    "https://bookish-space-parakeet-6q5jv596x56c5r5w-8001.app.github.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Model(BaseModel):
    name: configuration.MODEL_TYPE


@app.get("/models")
def get_models() -> dict[str, Any]:
    return get_model_config()


for model in AVAILABLE_MODELS:
    app.include_router(model.router, prefix=f"/models/{model.MODEL.value}")


app.include_router(project_endpoints.router)
