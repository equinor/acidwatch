from acidwatch_api.models.datamodel import JsonResult

from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
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

    valid_substances = [
        "CH2O2",
        "CH3CH2OH",
        "CO",
        "H2",
        "O2",
        "CH3COOH",
        "CH3OH",
        "CH4",
        "CH3CHO",
        "H2CO",
        "H2O",
        "H2SO4",
        "H2S",
        "S8",
        "SO2",
        "H2SO3",
        "HNO3",
        "NO2",
        "NH3",
        "HNO2",
        "NO",
        "N2",
        "NOHSO4",
    ]

    parameters: ArcsParameters
    base_url = configuration.ARCS_API_BASE_URI

    async def run(self) -> RunResult:
        response = await self.client.post(
            f"{configuration.ARCS_API_BASE_URI}/run_simulation",
            json={
                "concs": self.concentrations,
                "temperature": self.parameters.temperature,
                "pressure": self.parameters.pressure,
                "samples": self.parameters.samples,
            },
            timeout=300.0,
        )

        result = response.json()
        return result["results"]["final_concs"], JsonResult(json=result)
