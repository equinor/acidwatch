import inspect
from typing import Any, Protocol, runtime_checkable

from acidwatch_api import authentication
from acidwatch_api.models.base import ADAPTERS, get_parameters_schema
import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from acidwatch_api.authentication import (
    get_jwt_token,
    swagger_ui_init_oauth_config,
)
from fastapi import Depends

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
    display_name: str
    concentrations: dict[str, float | int | None]
    parameters: dict[str, Any]
    access_error: str | None


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
                raise TypeError(
                    f"Field {name} in class {base_model} is annotated with Setting, but its type is not one of the valid ones"
                )

            out.append({"name": name, "type": annot.__origin__.__name__, **asdict(obj)})
    return out


# Modify the get_models endpoint to check for user authentication
@fastapi_app.get("/models")
def get_models(
    jwt_token: str | None = Depends(get_jwt_token),
) -> list[ModelResponse]:
    models: list[ModelResponse] = []

    for adapter in ADAPTERS.values():
        access_error: str | None = None
        if adapter.authentication:
            assert adapter.scope is not None

            if jwt_token is None:
                access_error = "You must be authenticated"
            else:
                result = authentication.confidential_app.acquire_token_on_behalf_of(
                    scopes=[adapter.scope], user_assertion=jwt_token
                )

                if "error_description" in result:
                    access_error = result["error_description"]

        models.append(
            ModelResponse(
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                concentrations=adapter.concentrations,
                parameters=get_parameters_schema(adapter),
                access_error=access_error,
            )
        )
    return models


@fastapi_app.post("/models/{model_id}/run")
async def run_model(
    model_id: str, concs: dict[str, float | int], settings: dict[str, str | int | float]
):
    adapter = ADAPTERS[model_id]

    vsettings = adapter.settings.model_validate(settings)

    return await adapter.run(concs, vsettings)


# Apply CORS middleware to the FastAPI application
app = CORSMiddleware(
    fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
