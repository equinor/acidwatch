from __future__ import annotations

from acidwatch_api.models.base import (
    BaseAdapter,
    RunResult,
)
from acidwatch_api.models.datamodel import TextResult
from acidwatch_api.settings import SETTINGS


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
        "NH3",
        "N2O",
        "N2O4",
        "NH4HSO4",
        "HCHO",
        "CH3CHO",
        "CH3COCH3",
        "HCOOH",
        "CH3COOH",
    ]
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities."

    category = "Primary"
    base_url = SETTINGS.phpitz_api_base_uri

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run",
            json={
                "concentrations": {
                    key.lower(): value for key, value in self.concentrations.items()
                },
                "temperature": self.conditions.temperature,
                "pressure": self.conditions.pressure,
            },
            timeout=60.0,
        )
        res.raise_for_status()

        data = res.json()

        final_concentrations: dict[str, float] = {
            component: values["equil_ppm"]
            for component, values in data["phase_reactions"].items()
            if component != "CO2"
        }

        return (final_concentrations, TextResult(data=data["raw"]))
