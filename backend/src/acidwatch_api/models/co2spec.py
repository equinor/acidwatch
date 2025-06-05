from enum import StrEnum, auto
from typing import Annotated

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from acidwatch_api import configuration
from acidwatch_api.authentication import acquire_token_for_downstream_api, oauth2_scheme
from acidwatch_api.models.datamodel import (
    InitFinalDiff,
    SimulationRequest,
    SimulationResults,
)

router = APIRouter()

MODEL = configuration.MODEL_TYPE.CO2SPEC


class Molecule(StrEnum):
    H2SO4 = auto()
    HNO3 = auto()
    HNO2 = auto()
    SO2 = auto()
    NO2 = auto()
    H2S = auto()
    H2O = auto()
    S8 = auto()
    O2 = auto()
    NO = auto()


class Co2specRequest(BaseModel):
    row: Molecule = Field(alias="rowValue")
    column: Molecule = Field(alias="columnValue")
    value: str = Field(default="h2so4", alias="valueValue")
    inputs: dict[Molecule, float]
    pipe_inputs: dict[str, float] = Field(default_factory=dict, alias="pipeInputs")


class PipeInputs(BaseModel):
    inner_diameter: Annotated[float, Field(alias="innerDiameter")]
    drop_out_length: Annotated[float, Field(alias="dropOutLength")]
    flowrate: float


class Concentrations(BaseModel):
    h2o: float
    o2: float
    so2: float
    no2: float
    h2s: float
    no: float
    h2so4: float
    hno3: float


class RunReactionResult(BaseModel):
    initial: Concentrations
    final: Concentrations
    change: Concentrations


def convert_to_concentrations(simulation_request: SimulationRequest) -> Concentrations:
    return Concentrations(
        h2o=simulation_request.concs.get("H2O", 0.0) * 1e6,
        o2=simulation_request.concs.get("O2", 0.0) * 1e6,
        so2=simulation_request.concs.get("SO2", 0.0) * 1e6,
        no2=simulation_request.concs.get("NO2", 0.0) * 1e6,
        h2s=simulation_request.concs.get("H2S", 0.0) * 1e6,
        no=simulation_request.concs.get("NO", 0.0) * 1e6,
        h2so4=simulation_request.concs.get("H2SO4", 0.0) * 1e6,
        hno3=simulation_request.concs.get("HNO3", 0.0) * 1e6,
    )


@router.post("/runs")
def post_co2spec_run(
    jwt_token: Annotated[str, oauth2_scheme],
    simulation_request: SimulationRequest,
) -> SimulationResults:
    concentrations = convert_to_concentrations(simulation_request)

    res = httpx.post(
        f"{configuration.CO2SPEC_API_BASE_URI}/api/run_reaction",
        json=concentrations.model_dump(),
        timeout=60.0,
        headers={
            "Authorization": "Bearer "
            + acquire_token_for_downstream_api(MODEL, jwt_token)
        },
    )
    res.raise_for_status()

    data = InitFinalDiff.model_validate(res)

    result = {
        "results": {"initfinaldiff": data},
        "chart_data": {
            "comps": {str(i): k.upper() for i, k in enumerate(data.change.keys())},
            "values": {str(i): v for i, v in enumerate(data.change.values())},
            "variance": {},
            "variance_minus": {},
        },
    }

    return SimulationResults.model_validate(result)
