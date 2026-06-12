import pytest
from fastapi.testclient import TestClient as _BaseTestClient
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models import base
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
    category = "Primary"
    valid_substances = ["H2O"]

    async def run(self):
        return {key: value / 2 for key, value in self.concentrations.items()}


class QuadruplingAdapter(base.BaseAdapter):
    model_id = "quadrupling"
    display_name = "Quadrupling Model"
    description = ""
    category = "Secondary"
    valid_substances = ["H2O"]

    async def run(self):
        return {key: value * 4 for key, value in self.concentrations.items()}


class FailingAdapter(base.BaseAdapter):
    model_id = "failing"
    display_name = "Failing Model"
    description = ""
    category = "Primary"
    valid_substances = ["H2O"]

    async def run(self):
        raise RuntimeError("Intentional failure for testing")


@pytest.fixture
def dummy_adapters(client):
    client.app.dependency_overrides[get_adapters] = lambda: {
        HalvingAdapter.model_id: HalvingAdapter,
        QuadruplingAdapter.model_id: QuadruplingAdapter,
        FailingAdapter.model_id: FailingAdapter,
    }


def _create_sweep(client, **overrides):
    body = {
        "sweptSubstance": "H2O",
        "range": {"min": 10, "max": 100, "steps": 10},
        "concentrations": {},
        "models": [{"modelId": "halving", "parameters": {}}],
    }
    body.update(overrides)
    response = client.post("/sweeps", json=body)
    return response


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_produces_linear_values_and_results(client):
    response = _create_sweep(client)
    response.raise_for_status()
    sweep_id = response.json()

    result = client.get_json(f"/sweeps/{sweep_id}/result")

    assert result["status"] == "done"
    assert result["sweptSubstance"] == "H2O"

    expected_values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    assert result["values"] == expected_values

    point_values = [point["value"] for point in result["points"]]
    assert point_values == expected_values

    for point in result["points"]:
        assert point["status"] == "done"
        assert point["error"] is None
        assert point["concentrations"] == {"H2O": point["value"] / 2}


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_points_are_individually_retrievable_simulations(client):
    sweep_id = _create_sweep(client).json()
    result = client.get_json(f"/sweeps/{sweep_id}/result")

    point = result["points"][0]
    simulation = client.get_json(f"/simulations/{point['simulationId']}/result")

    assert simulation["status"] == "done"
    assert simulation["input"]["concentrations"] == {"H2O": point["value"]}
    assert simulation["results"][-1]["concentrations"] == point["concentrations"]


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_runs_full_model_chain(client):
    sweep_id = _create_sweep(
        client,
        models=[
            {"modelId": "halving", "parameters": {}},
            {"modelId": "quadrupling", "parameters": {}},
        ],
    ).json()

    result = client.get_json(f"/sweeps/{sweep_id}/result")

    assert [m["modelId"] for m in result["models"]] == ["halving", "quadrupling"]
    for point in result["points"]:
        # value -> /2 (halving) -> *4 (quadrupling) == value * 2
        assert point["concentrations"] == {"H2O": point["value"] * 2}


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_surfaces_per_point_errors_without_failing_whole_sweep(client):
    sweep_id = _create_sweep(
        client, models=[{"modelId": "failing", "parameters": {}}]
    ).json()

    result = client.get_json(f"/sweeps/{sweep_id}/result")

    assert result["status"] == "done"
    for point in result["points"]:
        assert point["status"] == "error"
        assert "Intentional failure for testing" in point["error"]
        assert point["concentrations"] == {}


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_rejects_unsupported_swept_substance(client):
    response = _create_sweep(client, sweptSubstance="CO2")
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
    assert "sweptSubstance" in response.json()["detail"]


@pytest.mark.usefixtures("dummy_adapters")
@pytest.mark.parametrize(
    "bad_range",
    [
        {"min": 100, "max": 10, "steps": 10},
        {"min": 10, "max": 10, "steps": 10},
        {"min": 10, "max": 100, "steps": 1},
        {"min": 10, "max": 100, "steps": 26},
    ],
)
def test_sweep_rejects_invalid_range(client, bad_range):
    response = _create_sweep(client, range=bad_range)
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.usefixtures("dummy_adapters")
def test_sweep_rejects_unknown_model(client):
    response = _create_sweep(
        client, models=[{"modelId": "does_not_exist", "parameters": {}}]
    )
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
