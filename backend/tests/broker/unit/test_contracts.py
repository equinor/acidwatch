from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from acidwatch_messaging import AdapterJob, AdapterResult, Heartbeat
from acidwatch_models.datamodel import Conditions, Phase


def test_broker_contracts_round_trip_as_json():
    model_input_id = uuid4()
    job = AdapterJob(
        model_input_id=model_input_id,
        model_id="example",
        concentrations={"H2O": 1},
        parameters={},
        conditions=Conditions(),
    )
    result = AdapterResult(
        model_input_id=model_input_id,
        phases=[
            Phase(
                kind="co2-rich",
                fraction=1,
                concentrations={"H2O": 0.5},
            )
        ],
    )
    heartbeat = Heartbeat(
        model_id="example",
        instance_id="worker-1",
        timestamp=datetime.now(),
        job_id=str(model_input_id),
    )

    assert AdapterJob.model_validate_json(job.model_dump_json()) == job
    assert AdapterResult.model_validate_json(result.model_dump_json()) == result
    assert Heartbeat.model_validate_json(heartbeat.model_dump_json()) == heartbeat


def test_broker_contracts_reject_unknown_fields():
    with pytest.raises(ValidationError):
        AdapterResult.model_validate(
            {
                "model_input_id": str(uuid4()),
                "phases": [],
                "panels": [],
                "error": None,
                "unexpected": True,
            }
        )
