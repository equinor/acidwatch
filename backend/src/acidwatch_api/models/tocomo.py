from __future__ import annotations
from acidwatch_api.models.base import BaseAdapter, RunResult
from acidwatch_api.models.datamodel import TableResult
from fastapi import APIRouter
from acidwatch_api.settings import SETTINGS

router = APIRouter()

DESCRIPTION: str = """The Tocal Consumption Model (ToCoMo) estimates final concentrations of chemicals based on initial input concentrations using a series of chemical reactions. 

The model applies the following reactions in a specific order:

3. H₂S + 3 NO₂ → SO₂ + H₂O + 3 NO
2. 2 NO + O₂ → 2 NO₂
1. NO₂ + SO₂ + H₂O → NO + H₂SO₄
4. 3 NO₂ + H₂O → 2 HNO₃ + NO
5. 2 NO₂ + H₂O → HNO₃ + HNO₂
6. 8 H₂S + 4 O₂ → 8 H₂O + S₈

The model operates as follows:
We go through the list in the order given and try to apply the reaction. 
If it is not possible with the current reaction, we proceed to the next one.
If a reaction can occur, it will be applied, and then we start from the top again.

This iterative approach allows ToCoMo to simulate the chemical interactions and provide estimates of final concentrations based on the initial conditions.
"""


class TocomoAdapter(BaseAdapter):
    model_id = "tocomo"
    display_name = "ToCoMo"
    description = DESCRIPTION
    category: str = "Primary"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = False
    base_url = SETTINGS.tocomo_api_base_uri

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run_reaction",
            json={key.lower(): value for key, value in self.concentrations.items()},
            timeout=60.0,
        )
        res.raise_for_status()
        result = res.json()

        return (
            {key.upper(): value for key, value in result["final"].items()},
            TableResult(data=result["steps"], label="Reaction Steps"),
        )
