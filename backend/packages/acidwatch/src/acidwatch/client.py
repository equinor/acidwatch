from __future__ import annotations
from pydantic.alias_generators import to_camel
from pydantic import BaseModel, ConfigDict, RootModel, Field
from typing_extensions import Doc
from typing import Annotated, Any
import httpx


DEFAULT_API_URL = "https://backend-acidwatch-prod.radix.equinor.com"


class _Parameter(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    default: Any
    label: str
    unit: Annotated[str | None, Field(None)]
    type: Annotated[str | None, Field(None)]


class Model(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    access_error: str | None
    model_id: str
    display_name: str
    description: str

    valid_substances: list[str]
    parameters: dict[str, _Parameter]


class Client(httpx.Client):
    def __init__(
        self,
        api_url: Annotated[
            str,
            Doc(
                """
                AcidWatch API URL, pointing to the root of the "backend".
                For local AcidWatch instance, use eg. "http://localhost:8000"
                """
            ),
        ] = DEFAULT_API_URL,
    ) -> None:
        super().__init__(base_url=api_url)

    def list_models(self) -> list[Model]:
        resp = self.get("/models")

        assert resp.status_code == 200

        root_model = RootModel[list[Model]]
        object = root_model.model_validate_json(resp.content)

        return object.root
