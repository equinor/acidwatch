from __future__ import annotations

import os

from acidwatch_models.base import (
    BaseAdapter,
    RunResult,
)
from acidwatch_models.datamodel import Phase, TextResult


class PhpitzReactiveAdapter(BaseAdapter):
    model_id = "phpitz_reactive"
    display_name = "pHPitz reactive"

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

    category = "ChemicalEquilibrium"
    base_url = os.environ.get("PHPITZ_API_BASE_URI")

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run",
            json={
                "concentrations": {
                    key.lower(): value for key, value in self.concentrations.items()
                },
                "temperature": self.conditions.temperature,
                "pressure": self.conditions.pressure,
                "solubility": False,
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

        return (
            [Phase(kind="co2-rich", fraction=1.0, concentrations=final_concentrations)],
            TextResult(data=data["raw"]),
        )
