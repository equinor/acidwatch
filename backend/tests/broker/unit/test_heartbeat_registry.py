"""Unit tests for the in-memory heartbeat registry.

Design under test (not yet implemented):

    acidwatch_api.broker.heartbeat.HeartbeatRegistry

The registry is a simple in-memory store, updated by the heartbeat listener
every time a worker publishes a heartbeat, and read by the
``GET /models/status`` endpoint. A model is "warm" if a heartbeat was
received within ``timeout`` seconds of "now", otherwise "cold". A model that
has never sent a heartbeat is also "cold".

The registry additionally tracks the ``job_id`` a worker reports itself as
currently processing (piggy-backed on the heartbeat payload), so job status
can be derived from the same mechanism instead of peeking at queues.
"""

from datetime import datetime, timedelta

import pytest

from acidwatch_api.broker.heartbeat import HeartbeatRegistry


@pytest.fixture
def now() -> datetime:
    return datetime(2026, 1, 1, 12, 0, 0)


def test_unknown_model_is_cold(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    assert registry.status("model_a", now=now) == "cold"


def test_model_is_warm_immediately_after_heartbeat(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    assert registry.status("model_a", now=now) == "warm"


@pytest.mark.parametrize(
    "elapsed_seconds, expected_status",
    [(59, "warm"), (60, "cold"), (61, "cold")],
)
def test_timeout_boundary(now, elapsed_seconds, expected_status):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    assert (
        registry.status("model_a", now=now + timedelta(seconds=elapsed_seconds))
        == expected_status
    )


def test_later_heartbeat_overwrites_earlier_one(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    registry.update(
        "model_a", instance_id="inst-1", timestamp=now + timedelta(seconds=30)
    )
    assert registry.status("model_a", now=now + timedelta(seconds=61)) == "warm"


def test_stale_heartbeat_does_not_revive_a_cold_model(now):
    """An out-of-order/delayed heartbeat older than the current record must
    not move the last-seen timestamp backwards."""
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    registry.update(
        "model_a", instance_id="inst-1", timestamp=now - timedelta(seconds=30)
    )
    assert registry.status("model_a", now=now + timedelta(seconds=61)) == "cold"


def test_all_statuses_returns_every_known_model(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    registry.update(
        "model_b", instance_id="inst-2", timestamp=now - timedelta(seconds=120)
    )

    assert registry.all_statuses(now=now) == {"model_a": "warm", "model_b": "cold"}


def test_multiple_instances_of_the_same_model_keep_it_warm_if_any_is_alive(now):
    """If a model is scaled to N replicas, only one heartbeat needs to be
    recent for the model as a whole to be reported warm."""
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update(
        "model_a", instance_id="inst-1", timestamp=now - timedelta(seconds=120)
    )
    registry.update("model_a", instance_id="inst-2", timestamp=now)

    assert registry.status("model_a", now=now) == "warm"


def test_job_status_is_unknown_when_job_id_never_reported(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    assert registry.job_status("job-123", now=now) == "unknown"


def test_job_status_is_processing_while_reporting_worker_is_warm(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now, job_id="job-123")
    assert registry.job_status("job-123", now=now) == "processing"


def test_job_status_becomes_unknown_once_worker_stops_reporting_it(now):
    """Once a worker's heartbeat no longer references the job (it moved on,
    or the job finished/crashed), the job is no longer "processing"."""
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now, job_id="job-123")
    registry.update(
        "model_a",
        instance_id="inst-1",
        timestamp=now + timedelta(seconds=30),
        job_id=None,
    )

    assert registry.job_status("job-123", now=now + timedelta(seconds=30)) == "unknown"


def test_job_status_becomes_unknown_once_reporting_worker_goes_cold(now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="inst-1", timestamp=now, job_id="job-123")

    assert registry.job_status("job-123", now=now + timedelta(seconds=61)) == "unknown"


def test_default_timeout_matches_documented_60_seconds(now):
    """The heartbeat architecture proposal uses a 60s warm/cold cutoff with
    workers publishing every 30s; this should be the registry's default so
    callers don't need to know the magic number."""
    registry = HeartbeatRegistry()
    registry.update("model_a", instance_id="inst-1", timestamp=now)
    assert registry.status("model_a", now=now + timedelta(seconds=59)) == "warm"
    assert registry.status("model_a", now=now + timedelta(seconds=61)) == "cold"
