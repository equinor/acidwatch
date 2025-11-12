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
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities."

    parameters: PhpitzParameters
    category = "Primary"
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
        parsed_data = self.parse_phpitz_simple(
            result[result.find("FINISH") : result.find("\n \n \n")]
        )

        final_concentrations: dict[str, float] = {
            component: data["end_ppm"]
            for component, data in parsed_data.items()
            if component != "CO2"
        }

        return (final_concentrations, TextResult(data=result))

    @staticmethod
    def parse_phpitz_simple(text: str) -> dict[str, dict[str, float]]:
        result = {}

        lines = text.split("\n")

        def float_cast(value: str) -> float:
            # We observe that the output value could be missing an e for very low value
            # such as 2.31-105
            # We only want to handle this very specific part
            try:
                return float(value)
            except ValueError as err:
                if "-" in value and "e" not in value or "E" not in value:
                    return float(value.replace("-", "e-"))
                raise err

        for line in lines:
            line = line.strip()
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
                        "start_moles": float_cast(parts[1]),
                        "end_moles": float_cast(parts[2]),
                        "end_ppm": float_cast(parts[3]),
                        "fugacity_coef": float_cast(parts[4]),
                    }
        return result
