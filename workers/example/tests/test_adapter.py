from uuid import uuid4

import pytest

from acidwatch_messaging import AdapterJob
from acidwatch_worker_runtime import run_adapter_job, run_adapter_standalone
from acidwatch_models.datamodel import Conditions
from acidwatch_worker_example import ExampleAdapter


@pytest.mark.asyncio
async def test_example_adapter():
    result = await run_adapter_job(
        ExampleAdapter,
        AdapterJob(
            model_input_id=uuid4(),
            model_id="example",
            concentrations={"H2O": 10},
            parameters={"spontaneouslyCombust": 50},
            conditions=Conditions(),
        ),
    )

    assert result.error is None
    assert result.phases[0].concentrations == {"H2O": 5}


def test_example_adapter_standalone():
    result = run_adapter_standalone(
        ExampleAdapter,
        {"H2O": 10},
        parameters={"spontaneouslyCombust": 25},
    )

    assert result.error is None
    assert result.phases[0].concentrations == {"H2O": 7.5}
