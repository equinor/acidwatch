from uuid import UUID

from sqlalchemy import func, select

import acidwatch_api.database as db
from acidwatch_api.routes._helpers import get_transport
from acidwatch_messaging import AdapterJob, job_queue_name
from acidwatch_models import BaseAdapter, get_adapters


class ModelA(BaseAdapter):
    model_id = "model_a"
    display_name = "Model A"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]


class ModelB(BaseAdapter):
    model_id = "model_b"
    display_name = "Model B"
    description = ""
    category = "PhaseEquilibrium"
    valid_substances = ["H2O"]


class RecordingTransport:
    def __init__(self, sessionmaker):
        self._sessionmaker = sessionmaker
        self.published = []
        self.persisted_counts = []

    async def publish(self, queue_name, payload):
        with self._sessionmaker() as session:
            counts = tuple(
                session.scalar(select(func.count()).select_from(table))
                for table in (db.GridSimulation, db.Simulation, db.ModelInput)
            )
        self.persisted_counts.append(counts)
        self.published.append((queue_name, payload))


def test_post_grid_persists_every_chain_before_publishing_first_jobs(
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
        "/grid-simulations",
        json={
            "axes": [{"substance": "H2O", "range": {"min": 10, "max": 20, "step": 10}}],
            "concentrations": {},
            "models": [
                {"modelId": "model_a", "parameters": {}},
                {"modelId": "model_b", "parameters": {}},
            ],
        },
    )
    response.raise_for_status()
    grid_id = UUID(response.json())

    with sql_session() as session:
        grid = session.get_one(db.GridSimulation, grid_id)
        simulations = [
            session.get_one(db.Simulation, UUID(simulation_id))
            for simulation_id in grid.simulation_ids
        ]
        chain_lengths = [len(simulation.model_inputs) for simulation in simulations]

    assert len(simulations) == 2
    assert chain_lengths == [2, 2]
    assert transport.persisted_counts == [(1, 2, 4), (1, 2, 4)]
    assert [queue_name for queue_name, _ in transport.published] == [
        job_queue_name("model_a"),
        job_queue_name("model_a"),
    ]
    assert all(
        isinstance(job, AdapterJob) and job.model_id == "model_a"
        for _, job in transport.published
    )
