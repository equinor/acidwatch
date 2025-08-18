from __future__ import annotations
import os

from acidwatch_api.models.base import BaseAdapter, RunResult
from acidwatch_api.models.datamodel import InitFinalDiff
from fastapi import APIRouter

from acidwatch_api import configuration

router = APIRouter()

DESCRIPTION: str = """The CO₂ specification calculator provides a way to give an estimate of concentrations given a known input. A set of equations are applied in order:

3. H₂S + 3 NO₂ → SO₂ + H₂O + 3 NO
2. 2 NO + O₂ → 2 NO₂
1. NO₂ + SO₂ + H₂O → NO + H₂SO₄
4. 3 NO₂ + H₂O → 2 HNO₃ + NO
5. 2 NO₂ + H₂O → HNO₃ + HNO₂
6. 8 H₂S + 4 O₂ → 8 H₂O + S₈

Some of the products in one equation is input to another, therefore the equations will be reapplied until no more reactions can occur. The following rule applies: We go through the list in the order given and try to apply the reaction. If it is not possible with the current equation we continue to the next. If a reaction can occur it will be applied and then we start from the top again."""


class TocomoAdapter(BaseAdapter):
    model_id = "co2spec"
    display_name = "ToCoMo"
    description = DESCRIPTION

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = True
    scope = os.environ.get("CO2SPEC_API_SCOPE")
    base_url = configuration.CO2SPEC_API_BASE_URI

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run_reaction",
            json={key.lower(): value for key, value in self.concentrations.items()},
            timeout=60.0,
        )
        res.raise_for_status()

        data = InitFinalDiff.model_validate(res.json())

        return {name.upper(): value for name, value in data.final.items()}
