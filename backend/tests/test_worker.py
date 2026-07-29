from collections.abc import Awaitable, Callable
from uuid import uuid4

import pytest

from acidwatch_api.adapters.base import BaseAdapter
from acidwatch_api.message_broker import (
    AdapterJob,
    AdapterResult,
    WorkerTransport,
)
from acidwatch_api.models.datamodel import Conditions, Phase
from acidwatch_api.worker import AdapterWorker


class _UnusedTransport(WorkerTransport):
    async def run(
        self, handler: Callable[[AdapterJob], Awaitable[AdapterResult]]
    ) -> None:
        raise AssertionError("Transport should not be started")

    async def shutdown(self) -> None:
        pass


class _HalvingAdapter(BaseAdapter):
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


class _FailingAdapter(_HalvingAdapter):
    model_id = "failing"

    async def run(self):
        raise RuntimeError("failed")


def _job(model_id: str) -> AdapterJob:
    return AdapterJob(
        model_input_id=uuid4(),
        model_id=model_id,
        concentrations={"H2O": 4, "N2": 2},
        parameters={},
        conditions=Conditions(),
    )


@pytest.mark.asyncio
async def test_worker_runs_adapter_and_preserves_passthrough():
    result = await AdapterWorker(_HalvingAdapter, _UnusedTransport()).run_job(
        _job("halving")
    )

    assert result.error is None
    assert result.phases[0].concentrations == {"N2": 2, "H2O": 2}


@pytest.mark.asyncio
async def test_worker_returns_adapter_errors():
    result = await AdapterWorker(_FailingAdapter, _UnusedTransport()).run_job(
        _job("failing")
    )

    assert result.phases == []
    assert result.error == "RuntimeError: failed"
