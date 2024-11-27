import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from acidwatch_api import configuration

router = APIRouter()

MODEL = configuration.MODEL_TYPE.ARCS


class ArcsSimulationRequest(BaseModel):
    temperature: int
    pressure: int
    concs: dict[str, float] = Field(default_factory=dict)
    samples: int

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "temperature": 300,
                    "pressure": 10,
                    "concs": {
                        "SO2": 10e-6,
                        "NO2": 50e-6,
                        "H2S": 30e-6,
                        "H2O": 20e-6,
                    },
                    "samples": 10,
                }
            ]
        }
    }


@router.post("/runs")
def post_arcs_run(simulation_request: ArcsSimulationRequest) -> dict:
    res = httpx.post(
        f"{configuration.ARCS_API_BASE_URI}/run_simulation",
        json=simulation_request.model_dump(),
        timeout=60.0,
    )
    res.raise_for_status()
    return res.json()
