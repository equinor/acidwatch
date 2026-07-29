import os
from typing import Any

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, TextResult
from acidwatch_models.definitions.phpitz_solubility import (
    PhpitzSolubilityAdapter as PhpitzSolubilityDefinition,
)


class PhpitzSolubilityAdapter(PhpitzSolubilityDefinition):
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
                "reactive": False,
            },
            timeout=60.0,
        )
        res.raise_for_status()

        data = res.json()
        return self._extract_phases(data), TextResult(data=data["raw"], label="Text")

    def _extract_phases(self, data: dict[str, Any]) -> list[Phase]:
        solubility = data.get("solubility") or {}
        total_gas = sum(entry.get("gas_mol", 0.0) for entry in solubility.values())
        total_water = sum(entry.get("water_mol", 0.0) for entry in solubility.values())
        total_mol = total_gas + total_water
        aqueous_fraction = total_water / total_mol if total_mol > 0 else 0.0
        co2_rich_concentrations: dict[str, float | int] = {}
        aqueous_concentrations: dict[str, float | int] = {}

        for component, entry in solubility.items():
            if component == "CO2":
                continue
            if total_gas > 0:
                co2_rich_concentrations[component] = (
                    entry.get("gas_mol", 0.0) / total_gas
                ) * 1e6
            if total_water > 0:
                aqueous_concentrations[component] = (
                    entry.get("water_mol", 0.0) / total_water
                ) * 1e6

        phases = [
            Phase(
                kind="co2-rich",
                fraction=1.0 - aqueous_fraction,
                concentrations=co2_rich_concentrations,
            )
        ]
        if aqueous_fraction > 0:
            phases.append(
                Phase(
                    kind="aqueous",
                    fraction=aqueous_fraction,
                    concentrations=aqueous_concentrations,
                )
            )
        return phases
