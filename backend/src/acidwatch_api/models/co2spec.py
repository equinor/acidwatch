from __future__ import annotations
import os

from acidwatch_api.models.base import BaseAdapter, RunResult
from acidwatch_api.models.datamodel import InitFinalDiff, JsonResult
from fastapi import APIRouter

from acidwatch_api import configuration

router = APIRouter()


class TocomoAdapter(BaseAdapter):
    model_id = "co2spec"
    display_name = "ToCoMo"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = False
    scope = os.environ.get("CO2SPEC_API_SCOPE")
    base_url = configuration.CO2SPEC_API_BASE_URI

    async def run(self) -> RunResult:
        res = await self.client.post(
            "/api/run_reaction",
            json={
                key.lower(): value * 1e6 for key, value in self.concentrations.items()
            },
            timeout=60.0,
        )
        res.raise_for_status()

        data = InitFinalDiff.model_validate(res.json())

        return {
            name.upper(): value * 1e-6 for name, value in data.final.items()
        }, JsonResult(json=res.json())
