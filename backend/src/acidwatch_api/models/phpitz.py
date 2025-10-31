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
    base_url = SETTINGS.phpitz_api_base_url

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
        return ({}, TextResult(data=result))
