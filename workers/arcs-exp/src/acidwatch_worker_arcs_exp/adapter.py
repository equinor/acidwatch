import os

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.arcs_exp import (
    ArcsExpAdapter as ArcsExpDefinition,
)


class ArcsExpAdapter(ArcsExpDefinition):
    base_url = os.environ.get("ARCS_EXP_API_BASE_URI")

    async def run(self) -> RunResult:
        response = await self.client.post(
            "/run_simulation",
            json={
                "concs": {
                    key: value / 1e6 for key, value in self.concentrations.items()
                },
                "temperature": self.conditions.temperature + 273,
                "pressure": self.conditions.pressure,
                "samples": 500,
            },
            timeout=300.0,
        )

        result = response.json()

        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value * 1e6 for key, value in result["results"].items()
                },
            )
        ]
