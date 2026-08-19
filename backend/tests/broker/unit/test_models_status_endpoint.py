from datetime import datetime, timedelta

import pytest

import acidwatch_api.routes._helpers as helpers_route
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.routes._helpers import get_heartbeat_registry
from acidwatch_models import get_adapters


@pytest.fixture
def frozen_now() -> datetime:
    return datetime(2026, 1, 1, 12, 0)


def override_status_dependencies(client, monkeypatch, registry, adapters):
    monkeypatch.setitem(
        client.app.dependency_overrides,
        get_heartbeat_registry,
        lambda: registry,
    )
    monkeypatch.setitem(
        client.app.dependency_overrides,
        get_adapters,
        lambda: adapters,
    )


def test_models_status_reports_warm_and_cold_models(client, monkeypatch, frozen_now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update("model_a", instance_id="worker-a", timestamp=frozen_now)
    registry.update(
        "model_b",
        instance_id="worker-b",
        timestamp=frozen_now - timedelta(minutes=5),
    )
    override_status_dependencies(
        client,
        monkeypatch,
        registry,
        {"model_a": object, "model_b": object},
    )
    monkeypatch.setattr(helpers_route, "_now", lambda: frozen_now)

    response = client.get("/models/status")
    response.raise_for_status()

    assert response.json() == {
        "model_a": {"status": "warm"},
        "model_b": {"status": "cold"},
    }


def test_models_status_does_not_expose_active_job_id(client, monkeypatch, frozen_now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update(
        "model_a",
        instance_id="worker-a",
        timestamp=frozen_now,
        job_id="job-123",
    )
    override_status_dependencies(
        client,
        monkeypatch,
        registry,
        {"model_a": object},
    )
    monkeypatch.setattr(helpers_route, "_now", lambda: frozen_now)

    response = client.get("/models/status")
    response.raise_for_status()

    assert response.json() == {"model_a": {"status": "warm"}}


def test_models_status_is_cold_before_first_heartbeat(client, monkeypatch, frozen_now):
    override_status_dependencies(
        client,
        monkeypatch,
        HeartbeatRegistry(timeout=timedelta(seconds=60)),
        {"model_a": object, "model_b": object},
    )
    monkeypatch.setattr(helpers_route, "_now", lambda: frozen_now)

    response = client.get("/models/status")
    response.raise_for_status()

    assert response.json() == {
        "model_a": {"status": "cold"},
        "model_b": {"status": "cold"},
    }
