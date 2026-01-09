"""Tests for simulation chain functionality."""

import pytest
from fastapi.testclient import TestClient as _BaseTestClient

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models import base
from acidwatch_api.models.base import BaseAdapter


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
            "oid": "test_user_oid",
            "upn": "testuser@equinor.com",
            "roles": [],
        },
    )
    with TestClient(fastapi_app) as c:
        yield c


class DummyPrimaryAdapter(BaseAdapter):
    """A primary model that doubles all concentrations."""

    model_id = "dummy_primary"
    display_name = "Dummy Primary"
    description = "Doubles input concentrations"
    category = "Primary"
    valid_substances = ["H2", "O2", "H2O"]

    async def run(self):
        return {k: v * 2 for k, v in self.concentrations.items()}


class DummySecondaryAdapter(BaseAdapter):
    """A secondary model that adds 10 to all concentrations."""

    model_id = "dummy_secondary"
    display_name = "Dummy Secondary"
    description = "Adds 10 to input concentrations"
    category = "Secondary"
    valid_substances = ["H2", "O2"]  # Intentionally excludes H2O

    async def run(self):
        return {k: v + 10 for k, v in self.concentrations.items()}


@pytest.fixture
def dummy_models(monkeypatch):
    """Register dummy primary and secondary models."""
    adapters = {
        DummyPrimaryAdapter.model_id: DummyPrimaryAdapter,
        DummySecondaryAdapter.model_id: DummySecondaryAdapter,
    }
    monkeypatch.setattr(base, "ADAPTERS", adapters)
    return adapters


class TestSingleSimulation:
    """Test single model execution using the chain architecture."""

    def test_single_primary_model_creates_system(self, client, dummy_models):
        """Test that running a single model creates a System object."""
        response = client.post(
            "/models/dummy_primary/runs",
            json={
                "concentrations": {"H2": 5, "O2": 10},
                "parameters": {},
            },
        )
        response.raise_for_status()
        simulation_id = response.json()

        # Get result
        result = client.get_json(f"/simulations/{simulation_id}/result")

        assert result["status"] == "done"
        assert len(result["stages"]) == 1

        stage = result["stages"][0]
        assert stage["status"] == "done"
        assert stage["modelInput"]["concentrations"] == {"H2": 5, "O2": 10}
        assert stage["finalConcentrations"] == {"H2": 10, "O2": 20, "H2O": 0}

    def test_single_model_returns_chain_response(self, client, dummy_models):
        """Test that single model returns ChainedRunResponse format."""
        response = client.post(
            "/models/dummy_primary/runs",
            json={
                "concentrations": {"H2": 1},
                "parameters": {},
            },
        )
        simulation_id = response.json()

        result = client.get_json(f"/simulations/{simulation_id}/result")

        # Should have ChainedRunResponse structure
        assert "stages" in result
        assert isinstance(result["stages"], list)
        assert result["status"] in ["done", "pending"]


class TestSimulationChain:
    """Test multi-model simulation chains."""

    def test_two_model_chain(self, client, dummy_models):
        """Test chain with primary and secondary models."""
        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "dummy_primary",
                        "concentrations": {"H2": 5, "O2": 10, "H2O": 2},
                        "parameters": {},
                    },
                    {
                        "modelId": "dummy_secondary",
                        "concentrations": {},  # Will be populated from primary
                        "parameters": {},
                    },
                ]
            },
        )
        response.raise_for_status()
        simulation_id = response.json()

        # Get result
        result = client.get_json(f"/simulations/{simulation_id}/result")

        assert result["status"] == "done"
        assert len(result["stages"]) == 2

        # Check primary stage
        primary = result["stages"][0]
        assert primary["status"] == "done"
        assert primary["modelInput"]["modelId"] == "dummy_primary"
        assert primary["modelInput"]["concentrations"] == {"H2": 5, "O2": 10, "H2O": 2}
        assert primary["finalConcentrations"] == {"H2": 10, "O2": 20, "H2O": 4}

        # Check secondary stage
        secondary = result["stages"][1]
        assert secondary["status"] == "done"
        assert secondary["modelInput"]["modelId"] == "dummy_secondary"
        # Secondary should only get valid substances (H2, O2 - not H2O)
        assert secondary["finalConcentrations"] == {"H2": 20, "O2": 30}

    def test_chain_filters_concentrations_to_valid_substances(
        self, client, dummy_models
    ):
        """Test that concentrations are filtered to valid substances when chaining."""
        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "dummy_primary",
                        "concentrations": {"H2": 10, "O2": 20, "H2O": 5},
                        "parameters": {},
                    },
                    {
                        "modelId": "dummy_secondary",
                        "concentrations": {},
                        "parameters": {},
                    },
                ]
            },
        )
        simulation_id = response.json()
        result = client.get_json(f"/simulations/{simulation_id}/result")

        secondary = result["stages"][1]
        # H2O should not be passed to secondary (not in valid_substances)
        assert "H2O" not in secondary["finalConcentrations"]
        assert secondary["finalConcentrations"] == {"H2": 30, "O2": 50}


class TestChainErrorHandling:
    """Test error handling in simulation chains."""

    def test_nonexistent_model_in_chain(self, client, dummy_models):
        """Test that nonexistent model returns 404."""
        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "nonexistent_model",
                        "concentrations": {"H2": 10},
                        "parameters": {},
                    },
                ]
            },
        )
        assert response.status_code == 404

    def test_chain_stops_on_failure(self, client, dummy_models, monkeypatch):
        """Test that chain execution stops when a stage fails."""

        # Make secondary model fail
        async def failing_run(self):
            raise ValueError("Model execution failed")

        monkeypatch.setattr(DummySecondaryAdapter, "run", failing_run)

        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "dummy_primary",
                        "concentrations": {"H2": 5},
                        "parameters": {},
                    },
                    {
                        "modelId": "dummy_secondary",
                        "concentrations": {},
                        "parameters": {},
                    },
                ]
            },
        )
        simulation_id = response.json()
        result = client.get_json(f"/simulations/{simulation_id}/result")

        # Primary should succeed
        assert result["stages"][0]["status"] == "done"

        # Secondary should fail
        assert result["stages"][1]["status"] == "failed"
        assert "failed" in result["stages"][1]["error"].lower()

    def test_chain_returns_partial_results_on_failure(
        self, client, dummy_models, monkeypatch
    ):
        """Test that we get partial results when a stage fails."""

        async def failing_run(self):
            raise RuntimeError("Secondary model error")

        monkeypatch.setattr(DummySecondaryAdapter, "run", failing_run)

        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "dummy_primary",
                        "concentrations": {"H2": 10, "O2": 20},
                        "parameters": {},
                    },
                    {
                        "modelId": "dummy_secondary",
                        "concentrations": {},
                        "parameters": {},
                    },
                ]
            },
        )
        simulation_id = response.json()
        result = client.get_json(f"/simulations/{simulation_id}/result")

        # Should return both stages
        assert len(result["stages"]) == 2

        # Primary results should be available
        assert result["stages"][0]["status"] == "done"
        assert result["stages"][0]["finalConcentrations"] == {
            "H2": 20,
            "O2": 40,
            "H2O": 0,
        }

        # Secondary should show failed
        assert result["stages"][1]["status"] == "failed"
        assert result["stages"][1]["error"] is not None


class TestSystemObject:
    """Test System object creation and usage."""

    def test_system_stores_initial_concentrations(self, client, dummy_models):
        """Test that System object stores initial concentrations."""
        initial_concs = {"H2": 100, "O2": 200}

        response = client.post(
            "/models/dummy_primary/runs",
            json={
                "concentrations": initial_concs,
                "parameters": {},
            },
        )
        simulation_id = response.json()
        result = client.get_json(f"/simulations/{simulation_id}/result")

        # Initial concentrations should be preserved in modelInput
        assert result["stages"][0]["modelInput"]["concentrations"] == initial_concs

    def test_chain_shares_system(self, client, dummy_models):
        """Test that all stages in a chain reference the same System."""
        response = client.post(
            "/simulations/chain",
            json={
                "stages": [
                    {
                        "modelId": "dummy_primary",
                        "concentrations": {"H2": 15, "O2": 25},
                        "parameters": {},
                    },
                    {
                        "modelId": "dummy_secondary",
                        "concentrations": {},
                        "parameters": {},
                    },
                ]
            },
        )
        simulation_id = response.json()
        result = client.get_json(f"/simulations/{simulation_id}/result")

        # Both stages should show the same initial concentrations
        primary_initial = result["stages"][0]["modelInput"]["concentrations"]
        secondary_initial = result["stages"][1]["modelInput"]["concentrations"]

        assert primary_initial == secondary_initial == {"H2": 15, "O2": 25}
