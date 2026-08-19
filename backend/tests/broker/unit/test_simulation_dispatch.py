from uuid import UUID

from acidwatch_messaging import AdapterJob, job_queue_name
import acidwatch_models.base as base
from acidwatch_api.routes._helpers import get_transport
from acidwatch_models import get_adapters
import acidwatch_api.database as db


class ModelA(base.BaseAdapter):
    model_id = "model_a"
    display_name = "Model A"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]


class ModelB(base.BaseAdapter):
    model_id = "model_b"
    display_name = "Model B"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]


class RecordingTransport:
    def __init__(self, sessionmaker):
        self._sessionmaker = sessionmaker
        self.published = []
        self.model_input_was_committed = False

    async def publish(self, queue_name, payload):
        assert isinstance(payload, AdapterJob)
        with self._sessionmaker() as session:
            self.model_input_was_committed = (
                session.get(db.ModelInput, payload.model_input_id) is not None
            )
        self.published.append((queue_name, payload))


def test_post_simulation_persists_chain_and_publishes_first_job(
    client, sql_session, monkeypatch
):
    transport = RecordingTransport(sql_session)
    monkeypatch.setitem(
        client.app.dependency_overrides,
        get_adapters,
        lambda: {"model_a": ModelA, "model_b": ModelB},
    )
    monkeypatch.setitem(
        client.app.dependency_overrides,
        get_transport,
        lambda: transport,
    )

    response = client.post(
        "/simulations",
        json={
            "concentrations": {"H2O": 100},
            "models": [
                {"modelId": "model_a", "parameters": {}},
                {"modelId": "model_b", "parameters": {}},
            ],
        },
    )
    response.raise_for_status()
    simulation_id = UUID(response.json())

    with sql_session() as session:
        simulation = session.get(db.Simulation, simulation_id)
        model_inputs = simulation.model_inputs

    assert len(model_inputs) == 2
    first = next(
        model_input
        for model_input in model_inputs
        if model_input.previous_model_input_id is None
    )
    second = next(
        model_input
        for model_input in model_inputs
        if model_input.previous_model_input_id == first.id
    )
    assert (first.model_id, second.model_id) == ("model_a", "model_b")

    assert len(transport.published) == 1
    assert transport.model_input_was_committed
    queue_name, job = transport.published[0]
    assert queue_name == job_queue_name("model_a")
    assert job.model_input_id == first.id
    assert job.model_id == "model_a"
    assert job.concentrations == {"H2O": 100}
