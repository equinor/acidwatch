from uuid import uuid4

import pytest

from acidwatch_messaging import AdapterJob
from acidwatch_worker_runtime import run_adapter_job
from acidwatch_models.datamodel import Conditions
from acidwatch_worker_tocomo import TocomoAdapter


@pytest.mark.asyncio
async def test_tocomo_adapter_runs_calculation_in_process():
    result = await run_adapter_job(
        TocomoAdapter,
        AdapterJob(
            model_input_id=uuid4(),
            model_id="tocomo",
            concentrations={
                "H2O": 40,
                "O2": 15,
                "SO2": 0,
                "NO2": 15,
                "H2S": 3,
            },
            parameters={},
            conditions=Conditions(),
        ),
    )

    assert result.error is None
    assert result.phases[0].concentrations == pytest.approx(
        {
            "H2SO4": 3,
            "HNO3": 15,
            "HNO2": 0,
            "SO2": 0,
            "NO2": 0,
            "H2S": 0,
            "H2O": 32.5,
            "S8": 0,
            "O2": 5.25,
            "NO": 0,
        },
        abs=0.01,
    )
    assert result.panels[0].label == "Reaction Steps"
    assert result.panels[0].data
