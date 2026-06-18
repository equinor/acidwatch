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
        solubility = data.get("solubility") or {}

        total_gas = sum(e.get("gas_mol", 0.0) for e in solubility.values())
        total_water = sum(e.get("water_mol", 0.0) for e in solubility.values())
        total_mol = total_gas + total_water

        aqueous_fraction = total_water / total_mol if total_mol > 0 else 0.0

        co2_rich_concs: dict[str, float | int] = {}
        aqueous_concs: dict[str, float | int] = {}

        for component, entry in solubility.items():
            if component == "CO2":
                continue
            if total_gas > 0:
                co2_rich_concs[component] = (
                    entry.get("gas_mol", 0.0) / total_gas
                ) * 1e6
            if total_water > 0:
                aqueous_concs[component] = (
                    entry.get("water_mol", 0.0) / total_water
                ) * 1e6

        phases: list[Phase] = [
            Phase(
                kind="co2-rich",
                fraction=1.0 - aqueous_fraction,
                concentrations=co2_rich_concs,
            )
        ]

        if aqueous_fraction > 0:
            phases.append(
                Phase(
                    kind="aqueous",
                    fraction=aqueous_fraction,
                    concentrations=aqueous_concs,
                )
            )

        return phases
