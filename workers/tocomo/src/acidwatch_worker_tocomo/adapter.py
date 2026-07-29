import os

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, TableResult
from acidwatch_models.definitions.tocomo import TocomoAdapter as TocomoDefinition


class TocomoAdapter(TocomoDefinition):
    base_url = os.environ.get("TOCOMO_API_BASE_URI")

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run_reaction",
            json={key.lower(): value for key, value in self.concentrations.items()},
            timeout=60.0,
        )
        res.raise_for_status()
        result = res.json()

        return (
            [
                Phase(
                    kind="co2-rich",
                    fraction=1.0,
                    concentrations={
                        key.upper(): value for key, value in result["final"].items()
                    },
                )
            ],
            TableResult(data=result["steps"], label="Reaction Steps"),
        )
