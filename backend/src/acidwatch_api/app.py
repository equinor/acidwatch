import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from acidwatch_api import configuration
from acidwatch_api.authentication import (
    authenticated_user_claims,
    swagger_ui_init_oauth_config,
)
from acidwatch_api.models import AVAILABLE_MODELS

app = fastapi.FastAPI(dependencies=[fastapi.Depends(authenticated_user_claims)])
app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

origins = [
    "http://localhost:8000",
    "https://frontend-acidwatch-dev.radix.equinor.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Model(BaseModel):
    name: configuration.MODEL_TYPE


@app.get("/models")
def get_models() -> list[Model]:
    return [Model(name=model.MODEL) for model in AVAILABLE_MODELS]


for model in AVAILABLE_MODELS:
    app.include_router(model.router, prefix=f"/models/{model.MODEL.value}")
