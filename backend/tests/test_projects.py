import pytest
from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from fastapi.testclient import TestClient


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
    return TestClient(fastapi_app)


def test_read_projects_empty(client):
    response = client.get("/projects")
    response.raise_for_status()

    assert response.json() == []


def test_create_and_delete_project(client):
    response = client.post("/projects", json={})
    response.raise_for_status()

    response = client.get("/projects")
    response.raise_for_status()

    assert response.json() == [0]
