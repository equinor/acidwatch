from uuid import uuid4

from acidwatch_messaging import AdapterJob
from acidwatch_models import BaseAdapter
from acidwatch_models.datamodel import Conditions, Phase
from acidwatch_worker_runtime import run_adapter_job


class HalvingAdapter(BaseAdapter):
    model_id = "halving"
    display_name = "Halving"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]

    async def run(self):
        return [
            Phase(
                kind="co2-rich",
                fraction=1,
                concentrations={
                    substance: concentration / 2
                    for substance, concentration in self.concentrations.items()
                },
            )
        ]


class FailingAdapter(HalvingAdapter):
    model_id = "failing"

    async def run(self):
        raise RuntimeError("intentional failure")


def job(model_id: str) -> AdapterJob:
    return AdapterJob(
        model_input_id=uuid4(),
        model_id=model_id,
        concentrations={"H2O": 10},
        parameters={},
        conditions=Conditions(),
    )


async def test_run_adapter_job_returns_model_output():
    result = await run_adapter_job(HalvingAdapter, job("halving"))

    assert result.error is None
    assert result.phases[0].concentrations == {"H2O": 5}


async def test_run_adapter_job_rejects_a_different_model():
    result = await run_adapter_job(HalvingAdapter, job("other"))

    assert result.error == "Worker cannot run model 'other'"


async def test_run_adapter_job_returns_adapter_errors():
    result = await run_adapter_job(FailingAdapter, job("failing"))

    assert result.error == "RuntimeError: intentional failure"
