import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Annotated
from acidwatch_api import configuration
from acidwatch_api.authentication import acquire_token_for_downstream_api, oauth2_scheme
from acidwatch_api.models.datamodel import SimulationRequest, SimulationResults

router = APIRouter()

MODEL = configuration.MODEL_TYPE.ARCS


class ArcsSimulationRequest(BaseModel):
    temperature: int
    pressure: int
    concs: dict[str, float] = Field(default_factory=dict)
    samples: int


def convert_to_arcs_simulation_request(
    simulation_request: SimulationRequest,
) -> ArcsSimulationRequest:
    return ArcsSimulationRequest(
        concs=simulation_request.concs,
        temperature=int(simulation_request.settings["Temperature"]),
        pressure=int(simulation_request.settings["Pressure"]),
        samples=int(simulation_request.settings["SampleLength"]),
    )


@router.post("/runs")
async def post_arcs_run(
    simulation_request: SimulationRequest,
    jwt_token: Annotated[str, oauth2_scheme],
) -> SimulationResults:
    arcs_simulation_request = convert_to_arcs_simulation_request(simulation_request)
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{configuration.ARCS_API_BASE_URI}/run_simulation",
            json=arcs_simulation_request.model_dump(),
            timeout=300.0,
            headers={
                "Authorization": "Bearer "
                + acquire_token_for_downstream_api(MODEL, jwt_token)
            },
        )

    res.raise_for_status()
    return SimulationResults(**res.json())
