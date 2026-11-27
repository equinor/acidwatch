import os

from acidwatch_messaging.datamodel import Phase, TextResult
from acidwatch_worker_runtime import RunResult

from .definition import PhpitzReactiveAdapter as PhpitzReactiveDefinition


class PhpitzReactiveAdapter(PhpitzReactiveDefinition):
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
        final_concentrations = {
            component: values["equil_ppm"]
            for component, values in data["phase_reactions"].items()
            if component != "CO2"
        }

        return (
            [
                Phase(
                    kind="co2-rich",
                    fraction=1.0,
                    concentrations=final_concentrations,
                )
            ],
            TextResult(data=data["raw"]),
        )
