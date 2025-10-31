from __future__ import annotations

from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    RunResult,
    Parameter,
    Unit,
)
from acidwatch_api.models.datamodel import TextResult
from acidwatch_api.settings import SETTINGS


class PhpitzParameters(BaseParameters):
    temperature: int = Parameter(
        300,
        label="Temperature",
        unit=Unit.TEMPERATURE_KELVIN,
        min=200,
        max=400,
    )

    pressure: int = Parameter(
        10,
        label="Pressure",
        unit="bara",
        min=1,
        max=300,
    )


class PhpitzAdapter(BaseAdapter):
    model_id = "phpitz"
    display_name = "pHPitz"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
        "N2",
        "NO",
        "H2SO4",
        "HNO3",
        "S8",
        "HNO2",
    ]
    description = ""

    parameters: PhpitzParameters
    category: str = "Primary"
    base_url = SETTINGS.phpitz_api_base_uri

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run",
            json={
                "concentrations": {
                    key.lower(): value for key, value in self.concentrations.items()
                },
                "temperature": self.parameters.temperature - 273,
                "pressure": self.parameters.pressure,
            },
            timeout=60.0,
        )
        res.raise_for_status()

        result = res.text.replace("\\n", "\n").strip("'")
        concentrations_dict = self.parse_phpitz_simple(
            result[result.find("FINISH") : result.find("\n \n \n")]
        )

        return (concentrations_dict, TextResult(data=result))

    @staticmethod
    def parse_phpitz_simple(text: str) -> dict:
        """
        Parse PHPitz table into a simple dictionary format.

        Returns:
            Dict with component names as keys and their data as nested dicts
        """
        result = {}

        lines = text.split("\n")

        for line in lines:
            line = line.strip()
            # Skip empty lines, separators, and headers
            if (
                line
                and not line.startswith("-")
                and not line.startswith("Component")
                and line != "FINISH"
            ):

                parts = line.split()
                if len(parts) >= 5:
                    component = parts[0]
                    result[component] = {
                        "start_moles": float(
                            parts[1].replace("E+", "e+").replace("E-", "e-")
                        ),
                        "end_moles": float(
                            parts[2].replace("E+", "e+").replace("E-", "e-")
                        ),
                        "end_ppm": float(
                            parts[3].replace("E+", "e+").replace("E-", "e-")
                        ),
                        "fugacity_coef": float(parts[4]),
                    }

        return result
