from enum import StrEnum, auto
import os
from typing import Annotated

from acidwatch_api.models.base import BaseAdapter, BaseParameters, Parameter
import httpx
from fastapi import APIRouter, HTTPException

from acidwatch_api import configuration
from acidwatch_api.authentication import acquire_token_for_downstream_api
from acidwatch_api.models.datamodel import (
    InitFinalDiff,
    SimulationRequest,
)
from pydantic.validate_call_decorator import validate_call

router = APIRouter()

MODEL = configuration.MODEL_TYPE.CO2SPEC


class PipeInputs(BaseParameters):
    inner_diameter: Annotated[float, Parameter(1)]
    drop_out_length: Annotated[float, Parameter(1)]
    flowrate: float = Parameter(2)


class TocomoAdapter(BaseAdapter):
    model_id = "co2spec"
    display_name = "ToCoMo"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = True
    scope = os.environ.get("CO2SPEC_API_SCOPE")
    base_url = configuration.CO2SPEC_API_BASE_URI
    parameters: PipeInputs

    async def run(self) -> dict[str, float]:
        res = httpx.post(
            "/api/run_reaction",
            json={key.lower(): value for key, value in self.concentrations},
            timeout=60.0,
        )
        res.raise_for_status()

        data = InitFinalDiff.model_validate(res.json())

        result = {
            "results": {"initfinaldiff": data},
            "chart_data": {
                "comps": {str(i): k.upper() for i, k in enumerate(data.change.keys())},
                "values": {str(i): v for i, v in enumerate(data.change.values())},
                "variance": {},
                "variance_minus": {},
            },
        }

        return data.final, result
