from __future__ import annotations

from typing import Any

from acidwatch_api.models.base import (
    BaseAdapter,
    RunResult,
)
from acidwatch_api.models.datamodel import Phase, TextResult
from acidwatch_api.settings import SETTINGS


class PhpitzSolubilityAdapter(BaseAdapter):
    model_id = "phpitz_solubility"
    display_name = "pHPitz solubility"

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
    description = "Computational model developed by Baard Kaasa as part of our CCS research on CO2 Impurities. Solubility part."

    category = "Secondary"
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
                "reactive": False,
            },
            timeout=60.0,
        )
        res.raise_for_status()

        data = res.json()

        phases = self._extract_phases(data)

        return phases, TextResult(data=data["raw"], label="pHPitz Solubility Output")

    def _extract_phases(self, data: dict[str, Any]) -> list[Phase]:
        aqueous = data.get("aqueous_phase") or {}

        wt_pct_to_ppm = 1e4
        component_by_field = {
            "h2so4_wt_pct": "H2SO4",
            "hno3_wt_pct": "HNO3",
            "nh3_wt_pct": "NH3",
            "co2_wt_pct": "CO2",
        }

        concentrations: dict[str, float | int] = {
            component: aqueous[field] * wt_pct_to_ppm
            for field, component in component_by_field.items()
            if field in aqueous
        }

        return [Phase(kind="aqueous", fraction=0.0, concentrations=concentrations)]
