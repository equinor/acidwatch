from typing import override
from acidwatch_api.models.model_config import ARCS_DEFAULTS
import httpx
from pydantic.config import JsonDict

from acidwatch_api.models.base import BaseAdapter, BaseParameters, Parameter, Unit
from acidwatch_api import configuration


class ArcsParameters(BaseParameters):
    temperature: int = Parameter(
        300,
        label="Temperature",
        unit=Unit.KELVIN,
        min=200,
        max=400,
    )

    pressure: int = Parameter(
        10,
        label="Pressure",
        unit=Unit.BAR_A,
        min=1,
        max=300,
    )

    samples: int = Parameter(
        10,
        label="Number of Samples",
        min=1,
        max=1000,
    )


class ArcsAdapter(BaseAdapter):
    model_id = "arcs"
    display_name = "ARCS"

    concentrations = {
        "CH2O2": None,
        "CH3CH2OH": None,
        "CO": None,
        "H2": None,
        "O2": 50,
        "CH3COOH": None,
        "CH3OH": None,
        "CH4": None,
        "CH3CHO": None,
        "H2CO": None,
        "H2O": 20,
        "H2SO4": None,
        "H2S": 30,
        "S8": None,
        "SO2": 10,
        "H2SO3": None,
        "HNO3": None,
        "NO2": 50,
        "NH3": None,
        "HNO2": None,
        "NO": None,
        "N2": None,
        "NOHSO4": None,
    }

    parameters: ArcsParameters

    @override
    async def run(self) -> tuple[dict[str, float], JsonDict]:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{configuration.ARCS_API_BASE_URI}/run_simulation",
                json={
                    "concs": self.concentrations,
                    "temperature": self.parameters.temperature,
                    "pressure": self.parameters.pressure,
                    "samples": self.parameters.samples,
                },
                timeout=300.0,
            )
        res.raise_for_status()
        return {}, res.json()
