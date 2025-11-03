from acidwatch_api.models.datamodel import ReactionPathsResult

from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
from acidwatch_api.settings import SETTINGS

DESCRIPTION: str = """Automated Reactions for CO2 Storage (ARCS) model.
    ARCS combines first-principles calculations with Monte-Carlo sampling and models possible reactions that may occur under a given set of conditions.
    This process identifies the most frequently occurring reactions and paths, final products, and expected concentrations."""


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
    category = "Primary"

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
    base_url = SETTINGS.arcs_api_base_uri

    async def run(self) -> RunResult:
        response = await self.client.post(
            f"{SETTINGS.arcs_api_base_uri}/run_simulation",
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
        paths = result["analysis"]["common_paths"]
        stats = result["analysis"]["stats"]
        common_paths = [
            {
                "Path": v.replace("<sub>", "").replace("</sub>", ""),
                "k": paths["k"][k],
                "Frequency": paths["frequency"][k],
            }
            for k, v in paths["paths"].items()
        ]
        all_stats = [
            {
                "Path": v,
                "k": stats["k"][k],
                "Frequency": stats["frequency"][k],
            }
            for k, v in stats["index"].items()
        ]

        return {
            k: v * 1e6 for k, v in result["results"]["final_concs"].items()
        }, ReactionPathsResult(
            common_paths=common_paths,
            stats=all_stats,
        )
