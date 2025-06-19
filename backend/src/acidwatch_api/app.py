from dataclasses import asdict, dataclass
import inspect
from typing import Annotated, Any, Protocol, runtime_checkable
import typing

from acidwatch_api.models.base import ADAPTERS, BaseAdapter, Setting
import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from acidwatch_api import configuration, project_endpoints
from acidwatch_api.authentication import (
    is_user_authenticated,
    swagger_ui_init_oauth_config,
)
from fastapi import Depends

from acidwatch_api.models import AVAILABLE_MODELS
from acidwatch_api.models.model_config import get_model_config

fastapi_app = fastapi.FastAPI()
fastapi_app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "https://frontend-acidwatch-dev.radix.equinor.com",
    "https://frontend-acidwatch-prod.radix.equinor.com",
    "https://acidwatch.radix.equinor.com",
]


class ModelResponse(BaseModel):
    model_id: str
    model_name: str
    concs: dict[str, float | int | None]
    settings: list[Any]


@runtime_checkable
class AnnotatedProto(Protocol):
    __origin__: type[Any]
    __metadata__: tuple[Any, ...]


def settings_to_json(base_model: type[BaseModel]) -> list[Any]:
    out: list[Any] = []
    for name, annot in inspect.get_annotations(base_model).items():
        if not isinstance(annot, AnnotatedProto):
            continue

        for obj in annot.__metadata__:
            if not isinstance(obj, Setting):
                continue

            if annot.__origin__ not in (str, int, float):
                raise TypeError(f"Field {name} in class {base_model} is annotated with Setting, but its type is not one of the valid ones")

            out.append({"name": name, "type": annot.__origin__.__name__, **asdict(obj)})
    return out


# Modify the get_models endpoint to check for user authentication
@fastapi_app.get("/models")
def get_models(
    user: bool = Depends(is_user_authenticated),
) -> list[ModelResponse]:
    return [
        ModelResponse(
            model_id=adapter.model_id,
            model_name=adapter.model_name,
            concs=adapter.concs,
            settings=settings_to_json(adapter.settings),
        ) for adapter in ADAPTERS.values()
    ]


@fastapi_app.post("/models/{model_id}/run")
async def run_model(model_id: str, concs: dict[str, float | int], settings: dict[str, str | int | float]):
    adapter = ADAPTERS[model_id]

    vsettings = adapter.settings.model_validate(settings)

    return await adapter.run(concs, vsettings)

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
