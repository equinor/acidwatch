import os

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, ReactionPathsResult
from acidwatch_models.definitions.arcs import ArcsAdapter as ArcsDefinition


class ArcsAdapter(ArcsDefinition):
    base_url = os.environ.get("ARCS_API_BASE_URI")

    async def run(self) -> RunResult:
        response = await self.client.post(
            "/run_simulation",
            json={
                "concs": {
                    key: value / 1e6 for key, value in self.concentrations.items()
                },
                "temperature": self.conditions.temperature + 273,
                "pressure": self.conditions.pressure,
                "samples": 2000,
            },
            timeout=300.0,
        )

        result = response.json()
        paths = result["analysis"]["common_paths"]
        stats = result["analysis"]["stats"]
        common_paths = [
            {
                "Path": value.replace("<sub>", "").replace("</sub>", ""),
                "k": paths["k"][key],
                "Frequency": paths["frequency"][key],
            }
            for key, value in paths["paths"].items()
        ]
        all_stats = [
            {
                "Path": value,
                "k": stats["k"][key],
                "Frequency": stats["frequency"][key],
            }
            for key, value in stats["index"].items()
        ]

        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value * 1e6
                    for key, value in result["results"]["final_concs"].items()
                },
            )
        ], ReactionPathsResult(common_paths=common_paths, stats=all_stats)
