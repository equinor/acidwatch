from datetime import datetime, timedelta

import acidwatch_api.database as db
import acidwatch_api.routes.models as models_route
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.routes.models import get_heartbeat_registry


def test_active_model_input_is_reported_as_processing(
    client, sql_session, monkeypatch
):
    now = datetime.now()
    simulation = db.Simulation(
        owner_id=None,
        phases=[
            {
                "kind": "co2-rich",
                "fraction": 1.0,
                "concentrations": {"H2O": 2.0},
            }
        ],
        model_inputs=[db.ModelInput(model_id="slow_model", parameters={})],
    )
    with sql_session() as session:
        session.add(simulation)
        session.commit()
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
