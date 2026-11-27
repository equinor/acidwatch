from datetime import datetime, timezone
from uuid import uuid4

from acidwatch_messaging import AdapterJob, HEARTBEATS_QUEUE
from acidwatch_messaging.datamodel import Conditions, Phase
from acidwatch_worker_runtime import (
    AdapterWorker,
    BaseAdapter,
    describe,
    read_build_time,
    run_adapter_job,
)


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


class NanAdapter(HalvingAdapter):
    model_id = "nan"

    async def run(self):
        return [
            Phase(
                kind="co2-rich",
                fraction=1,
                concentrations={"H2O": float("nan")},
            )
        ]


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


async def test_run_adapter_job_preserves_unsupported_substances():
    adapter_job = job("halving")
    adapter_job.concentrations["CH4"] = 2

    result = await run_adapter_job(HalvingAdapter, adapter_job)

    assert result.error is None
    assert result.phases[0].concentrations == {"H2O": 5, "CH4": 2}


async def test_run_adapter_job_rejects_a_different_model():
    result = await run_adapter_job(HalvingAdapter, job("other"))

    assert result.error == "Worker cannot run model 'other'"


async def test_run_adapter_job_returns_adapter_errors():
    result = await run_adapter_job(FailingAdapter, job("failing"))

    assert result.error == "RuntimeError: intentional failure"


async def test_run_adapter_job_returns_error_when_model_yields_nan():
    adapter_job = job("nan")

    result = await run_adapter_job(NanAdapter, adapter_job)

    assert result.model_input_id == adapter_job.model_input_id
    assert result.error is not None
    assert result.error == (
        "Model produced invalid output. "
        "Input should be a finite number: ('concentrations', 'H2O', 'int'); "
        "Input should be a finite number: ('concentrations', 'H2O', 'float')"
    )
    assert result.phases == []


class BoundedAdapter(HalvingAdapter):
    model_id = "bounded"
    concentration_bounds = {"H2O": {"min": 1, "max": 200}}


def test_description_carries_the_rules_the_api_validates_with():
    descriptor = describe(BoundedAdapter)

    assert descriptor.concentration_errors({"H2O": 100, "CO2": 5}) == {}
    assert descriptor.concentration_errors({"H2O": 0.5}) == {
        "H2O": ["must be >= 1 ppm"]
    }
    assert descriptor.concentration_errors({"H2O": 500}) == {
        "H2O": ["must be <= 200 ppm"]
    }
    assert descriptor.concentration_errors({"CH4": 1}) == {
        "CH4": ["Extra inputs are not permitted"]
    }


async def test_worker_announces_its_model_with_every_heartbeat():
    published = []

    class RecordingTransport:
        async def publish(self, queue_name, payload):
            published.append((queue_name, payload))

    await AdapterWorker(HalvingAdapter, RecordingTransport())._send_heartbeat()

    [(queue_name, heartbeat)] = published
    assert queue_name == HEARTBEATS_QUEUE
    assert heartbeat.descriptor == describe(HalvingAdapter)


def test_build_time_is_read_from_the_image_and_absent_elsewhere(tmp_path):
    recorded = tmp_path / "build-time"
    recorded.write_text("1764237600\n")

    assert read_build_time(recorded) == datetime(
        2025, 11, 27, 10, 0, tzinfo=timezone.utc
    )
    assert read_build_time(tmp_path / "missing") is None
