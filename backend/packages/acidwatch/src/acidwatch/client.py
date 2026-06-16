from __future__ import annotations
import time
from uuid import UUID
from pydantic.alias_generators import to_camel
from pydantic import BaseModel, ConfigDict, RootModel, Field
from typing_extensions import Doc
from typing import Annotated, Any, Literal
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


class _IndivitualResult(BaseModel):
    concentrations: dict[str, float]


class SimulationResult(BaseModel):
    status: Literal["done"]
    results: list[_IndivitualResult]


class SimulationResultPending(BaseModel):
    status: Literal["pending"]


_SimulationResult = RootModel[
    Annotated[
        SimulationResult | SimulationResultPending,
        Field(discriminator="status"),
    ]
]


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

    def run_model(
        self,
        model_id: str,
        concs: dict[str, float],
        params: dict[str, Any],
        *,
        temperature: float = 25,
        pressure: float = 10,
        retries: int = 9999,
    ) -> SimulationResult:
        response = self.post(
            "/simulations",
            json={
                "concentrations": concs,
                "conditions": {
                    "temperature": temperature,
                    "pressure": pressure,
                },
                "models": [
                    {
                        "modelId": model_id,
                        "parameters": params,
                    }
                ],
            },
        )

        if response.status_code != 200:
            raise RuntimeError("Couldn't start model run", response.json())

        simulation_id = UUID(response.json())

        for _ in range(retries):
            response = self.get(f"/simulations/{simulation_id}/result")
            if response.status_code != 200:
                raise RuntimeError("Couldn't poll model run", response.json())

            res = _SimulationResult.model_validate_json(response.content)
            if isinstance(res.root, SimulationResult):
                return res.root

            time.sleep(0.5)

        raise RuntimeError("Out of retries")
