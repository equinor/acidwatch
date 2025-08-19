from acidwatch_api.models.datamodel import ReactionPathsResult

from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
from acidwatch_api import configuration

DESCRIPTION: str = (
    """ARCS is a model for simulating acid gas reactions in CO2 storage."""
)


class ArcsParameters(BaseParameters):
    temperature: int = Parameter(
        300,
        label="Temperature",
        unit=Unit.TEMPERATURE_KELVIN,
        min=200,
        max=400,
        description="Temperature in Celsius",
    )

    pressure: int = Parameter(
        10,
        label="Pressure",
        unit="bara",
        min=1,
        max=300,
        description="Pressure in bara",
    )


class ArcsAdapter(BaseAdapter):
    model_id = "arcs"
    display_name = "ARCS"
    description = DESCRIPTION
    category: str = "Primary"

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
                "concs": {
                    key: value / 1e6 for key, value in self.concentrations.items()
                },
                "temperature": self.parameters.temperature,
                "pressure": self.parameters.pressure,
                "samples": 2000,  # Default to 2000 samples
            },
            timeout=300.0,
        )

        result = response.json()
        return {
            k: v * 1e6 for k, v in result["results"]["final_concs"].items()
        }, ReactionPathsResult(
            common_paths=result["analysis"]["common_paths"],
            stats=result["analysis"]["stats"],
        )
