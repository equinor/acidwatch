from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import pytest

import acidwatch_api.database as db
import acidwatch_api.routes.models as models_route
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.routes.models import get_heartbeat_registry
from acidwatch_api.settings import SETTINGS


def _make_phases(concentrations: dict[str, int | float]) -> list[dict]:
    return [{"kind": "co2-rich", "fraction": 1.0, "concentrations": concentrations}]


def _create_pending_simulation(sql_session, age: timedelta) -> db.Simulation:
    simulation = db.Simulation(
        owner_id=None,
        phases=_make_phases({"H2O": 2.0}),
        model_inputs=[
            db.ModelInput(
                model_id="slow_model",
                parameters={},
                created_at=datetime.now() - age,
            ),
        ],
    )
    with sql_session() as session:
        session.add(simulation)
        session.commit()
        session.refresh(simulation)
        for mi in simulation.model_inputs:
            session.refresh(mi)

    return simulation


@pytest.fixture(autouse=True)
def _short_timeout(monkeypatch):
    monkeypatch.setattr(SETTINGS, "model_input_timeout_minutes", 60)


def test_pending_result_within_timeout_stays_pending(client, sql_session):
    simulation = _create_pending_simulation(sql_session, age=timedelta(minutes=10))

    response = client.get(f"/simulations/{simulation.id}/result")
    response.raise_for_status()

    assert response.json()["status"] == "pending"


def test_active_model_input_is_processing_and_does_not_time_out(
    client, sql_session, monkeypatch
):
    now = datetime.now()
    simulation = _create_pending_simulation(sql_session, age=timedelta(minutes=120))
    model_input_id = simulation.model_inputs[0].id
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    registry.update(
        "slow_model",
        instance_id="worker-1",
        timestamp=now,
        job_id=str(model_input_id),
    )
    monkeypatch.setitem(
        client.app.dependency_overrides,
        get_heartbeat_registry,
        lambda: registry,
    )
    monkeypatch.setattr(models_route, "_now", lambda: now)

    response = client.get(f"/simulations/{simulation.id}/result")
    response.raise_for_status()

    assert response.json()["status"] == "processing"
    with sql_session() as session:
        assert (
            session.query(db.ModelResult)
            .filter(db.ModelResult.model_input_id == model_input_id)
            .one_or_none()
            is None
        )


def test_pending_result_past_timeout_is_marked_as_error(client, sql_session):
    simulation = _create_pending_simulation(sql_session, age=timedelta(minutes=120))

    response = client.get(f"/simulations/{simulation.id}/result")
    response.raise_for_status()
    body = response.json()

    assert body["status"] == "error"
    assert "timed out" in body["error"].lower()


def test_timeout_marking_persists_a_model_result_row(client, sql_session):
    simulation = _create_pending_simulation(sql_session, age=timedelta(minutes=120))

    client.get(f"/simulations/{simulation.id}/result").raise_for_status()

    with sql_session() as session:
        result = (
            session.query(db.ModelResult)
            .filter(db.ModelResult.model_input_id == simulation.model_inputs[0].id)
            .one_or_none()
        )
    assert result is not None
    assert result.error is not None
    assert "timed out" in result.error.lower()


def test_timeout_detection_is_idempotent(client, sql_session):
    simulation = _create_pending_simulation(sql_session, age=timedelta(minutes=120))

    first = client.get(f"/simulations/{simulation.id}/result")
    first.raise_for_status()

    second = client.get(f"/simulations/{simulation.id}/result")
    second.raise_for_status()

    assert first.json() == second.json()

    with sql_session() as session:
        count = (
            session.query(db.ModelResult)
            .filter(db.ModelResult.model_input_id == simulation.model_inputs[0].id)
            .count()
        )
    assert count == 1


def test_second_model_in_chain_can_time_out_after_first_completes(client, sql_session):
    first_input_id = uuid4()
    second_input_id = uuid4()
    simulation = db.Simulation(
        owner_id=None,
        phases=_make_phases({"H2O": 2.0}),
        model_inputs=[
            db.ModelInput(
                id=first_input_id,
                model_id="fast_model",
                parameters={},
                created_at=datetime.now() - timedelta(minutes=125),
                result=db.ModelResult(
                    phases=_make_phases({"H2O": 1.0}), panels=[], error=None
                ),
            ),
            db.ModelInput(
                id=second_input_id,
                previous_model_input_id=first_input_id,
                model_id="slow_model",
                parameters={},
                created_at=datetime.now() - timedelta(minutes=120),
            ),
        ],
    )
    with sql_session() as session:
        session.add(simulation)
        session.commit()

    response = client.get(f"/simulations/{simulation.id}/result")
    response.raise_for_status()
    body = response.json()

    assert body["status"] == "error"
    assert "timed out" in body["error"].lower()
    assert body["results"] == [{"phases": _make_phases({"H2O": 1.0}), "panels": []}], (
        "The already-completed fast_model result must be preserved in the "
        "response even though a later model in the chain timed out"
    )
