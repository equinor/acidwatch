import pytest
from fastapi.testclient import TestClient as _BaseTestClient
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models import base
from acidwatch_api.models.datamodel import Phase
from acidwatch_api.routes.models import get_adapters


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


class HalvingAdapter(base.BaseAdapter):
    model_id = "halving"
    display_name = "Halving Model"
    description = ""
    category = "Reactive"
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
    category = "PhaseTransition"
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
    category = "Reactive"
    valid_substances = ["H2O"]

    async def run(self):
        raise RuntimeError("Intentional failure for testing")


class TwoSubstanceAdapter(base.BaseAdapter):
    model_id = "two-substance"
    display_name = "Two Substance Model"
    description = ""
    category = "Reactive"
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
        "axes": [{"substance": "H2O", "range": {"min": 10, "max": 100, "steps": 10}}],
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

    assert result["status"] == "done"
    assert len(result["axes"]) == 1
    assert result["axes"][0]["substance"] == "H2O"
    assert len(result["simulations"]) == 10

    for sim in result["simulations"]:
        assert sim["status"] == "done"


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_points_are_individually_retrievable_simulations(client):
    grid_id = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 10, "max": 20, "steps": 2}}],
    ).json()
    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    sim = result["simulations"][0]
    assert sim["input"]["concentrations"] == {"H2O": 10}


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_runs_full_model_chain(client):
    grid_id = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 5, "max": 10, "steps": 2}}],
        models=[
            {"modelId": "halving", "parameters": {}},
            {"modelId": "quadrupling", "parameters": {}},
        ],
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    for sim in result["simulations"]:
        assert sim["status"] == "done"
        assert len(sim["results"]) == 2


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_surfaces_per_point_errors_without_failing_whole_request(client):
    grid_id = _create_grid(
        client, models=[{"modelId": "failing", "parameters": {}}]
    ).json()

    result = client.get_json(f"/grid-simulations/{grid_id}/result")

    assert result["status"] == "done"
    for sim in result["simulations"]:
        assert sim["status"] == "error"
        assert sim["error"] is not None


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
        axes=[{"substance": "UNKNOWN", "range": {"min": 1, "max": 10, "steps": 2}}],
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_grid_rejects_invalid_range(client):
    response = _create_grid(
        client,
        axes=[{"substance": "H2O", "range": {"min": 100, "max": 10, "steps": 5}}],
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
            {"substance": "H2O", "range": {"min": 10, "max": 20, "steps": 2}},
            {"substance": "NaCl", "range": {"min": 100, "max": 200, "steps": 2}},
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
            {"substance": "H2O", "range": {"min": 10, "max": 20, "steps": 2}},
            {"substance": "H2O", "range": {"min": 100, "max": 200, "steps": 2}},
        ],
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
