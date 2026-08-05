import pytest
from fastapi.testclient import TestClient as _BaseTestClient
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

import acidwatch_api.database as db
from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_messaging import AdapterJob, job_queue_name
import acidwatch_models.base as base
from acidwatch_models.datamodel import Phase
from acidwatch_models import get_adapters


class TestClient(_BaseTestClient):
    def get_json(self, *args, **kwargs):
        response = self.get(*args, **kwargs)
        response.raise_for_status()
        return response.json()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setitem(
        fastapi_app.dependency_overrides,
        authenticated_user_claims,
        lambda: {
            "oid": "the_oid",
            "upn": "theauthenticateduser@equinor.com",
            "roles": [],
        },
    )
    with TestClient(fastapi_app) as c:
        yield c


@pytest.fixture
def sql_session(client):
    return client.app_state["session"]


class HalvingAdapter(base.BaseAdapter):
    model_id = "halving"
    display_name = "Halving Model"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]

    async def run(self):
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value / 2 for key, value in self.concentrations.items()
                },
            )
        ]


class QuadruplingAdapter(base.BaseAdapter):
    model_id = "quadrupling"
    display_name = "Quadrupling Model"
    description = ""
    category = "PhaseEquilibrium"
    valid_substances = ["H2O"]

    async def run(self):
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value * 4 for key, value in self.concentrations.items()
                },
            )
        ]


class FailingAdapter(base.BaseAdapter):
    model_id = "failing"
    display_name = "Failing Model"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]

    async def run(self):
        raise RuntimeError("Intentional failure for testing")


class TwoSubstanceAdapter(base.BaseAdapter):
    model_id = "two-substance"
    display_name = "Two Substance Model"
    description = ""
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O", "NaCl"]

    async def run(self):
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value / 2 for key, value in self.concentrations.items()
                },
            )
        ]


@pytest.fixture
def dummy_adapters(client):
    client.app.dependency_overrides[get_adapters] = lambda: {
        HalvingAdapter.model_id: HalvingAdapter,
        QuadruplingAdapter.model_id: QuadruplingAdapter,
        FailingAdapter.model_id: FailingAdapter,
    }
    yield
    del client.app.dependency_overrides[get_adapters]


def _create_grid(client, **overrides):
    body = {
        "axes": [{"substance": "H2O", "range": {"min": 10, "max": 100, "step": 10}}],
        "concentrations": {},
        "models": [{"modelId": "halving", "parameters": {}}],
    }
    body.update(overrides)
    response = client.post("/grid-simulations", json=body)
    return response


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_produces_correct_number_of_points(client):
    response = _create_grid(client)
    response.raise_for_status()
    grid_id = response.json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    assert result["status"] == "pending"
    assert len(result["axes"]) == 1
    assert result["axes"][0]["substance"] == "H2O"
    assert len(result["simulations"]) == 10

    for sim in result["simulations"]:
        assert sim["status"] == "pending"

    published = client.app_state["transport"].published
    assert [queue_name for queue_name, _ in published] == [
        job_queue_name("halving")
    ] * 10
    jobs = [job for _, job in published]
    assert all(isinstance(job, AdapterJob) for job in jobs)
    assert [job.concentrations for job in jobs] == [
        {"H2O": value} for value in range(10, 101, 10)
    ]


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_points_are_individually_retrievable_simulations(client):
    grid_id = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 10, "max": 20, "step": 5}}],
    ).json()
    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    sim = result["simulations"][0]
    assert sim["input"]["concentrations"] == {"H2O": 10}


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_runs_full_model_chain(client):
    grid_id = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 5, "max": 10, "step": 5}}],
        models=[
            {"modelId": "halving", "parameters": {}},
            {"modelId": "quadrupling", "parameters": {}},
        ],
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    for sim in result["simulations"]:
        assert sim["status"] == "pending"
        assert sim["results"] == []


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_defers_adapter_errors_to_workers(client):
    grid_id = _create_grid(
        client, models=[{"modelId": "failing", "parameters": {}}]
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    assert result["status"] == "pending"
    for sim in result["simulations"]:
        assert sim["status"] == "pending"
        assert sim["error"] is None


def test_grid_returns_finished_points_while_others_are_pending(client, sql_session):
    simulation_ids = []
    with sql_session() as session:
        for index, concentration in enumerate((10, 20, 30, 40)):
            model_input = db.ModelInput(
                previous_model_input_id=None,
                model_id="halving",
                parameters={},
            )
            simulation = db.Simulation(
                owner_id=None,
                phases=[
                    {
                        "kind": "co2-rich",
                        "fraction": 1.0,
                        "concentrations": {"H2O": concentration},
                    }
                ],
                conditions={},
                model_inputs=[model_input],
            )
            session.add(simulation)
            session.flush()
            simulation_ids.append(str(simulation.id))

            if index < 2:
                session.add(
                    db.ModelResult(
                        model_input=model_input,
                        phases=[
                            {
                                "kind": "co2-rich",
                                "fraction": 1.0,
                                "concentrations": {"H2O": concentration / 2},
                            }
                        ],
                        panels=[],
                        error=None,
                    )
                )

        grid = db.GridSimulation(
            owner_id=None,
            axes=[
                {
                    "substance": "H2O",
                    "range": {"min": 10, "max": 40, "step": 10},
                }
            ],
            simulation_ids=simulation_ids,
        )
        session.add(grid)
        session.commit()
        grid_id = grid.id

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    assert result["status"] == "pending"
    assert [sim["status"] for sim in result["simulations"]] == [
        "done",
        "done",
        "pending",
        "pending",
    ]

    finished, still_running = result["simulations"][0], result["simulations"][2]
    assert finished["results"][0]["phases"][0]["concentrations"] == {"H2O": 5}
    assert still_running["results"] == []
    assert still_running["input"]["concentrations"] == {"H2O": 30}


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_rejects_unknown_model(client):
    response = _create_grid(
        client, models=[{"modelId": "nonexistent", "parameters": {}}]
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_rejects_unsupported_substance(client):
    response = _create_grid(
        client,
        axes=[{"substance": "UNKNOWN", "range": {"min": 1, "max": 10, "step": 5}}],
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_rejects_invalid_range(client):
    response = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 100, "max": 10, "step": 5}}],
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_returns_conditions(client):
    grid_id = _create_grid(
        client,
        conditions={"temperature": 80, "pressure": 20},
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    for sim in result["simulations"]:
        assert sim["input"]["conditions"] == {"temperature": 80, "pressure": 20}


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_2d_matrix(client):
    client.app.dependency_overrides[get_adapters] = lambda: {
        HalvingAdapter.model_id: HalvingAdapter,
        QuadruplingAdapter.model_id: QuadruplingAdapter,
        FailingAdapter.model_id: FailingAdapter,
        TwoSubstanceAdapter.model_id: TwoSubstanceAdapter,
    }
    grid_id = _create_grid(
        client,
        axes=[
            {"substance": "H2O", "range": {"min": 10, "max": 20, "step": 10}},
            {"substance": "NaCl", "range": {"min": 100, "max": 200, "step": 100}},
        ],
        models=[{"modelId": "two-substance", "parameters": {}}],
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    assert len(result["simulations"]) == 4


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_requires_at_least_one_axis(client):
    response = _create_grid(client, axes=[])
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_rejects_duplicate_axis_substances(client):
    response = _create_grid(
        client,
        axes=[
            {"substance": "H2O", "range": {"min": 10, "max": 20, "step": 10}},
            {"substance": "H2O", "range": {"min": 100, "max": 200, "step": 100}},
        ],
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
