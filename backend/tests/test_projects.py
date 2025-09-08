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
    # Create
    response = client.post(
        "/project", json={"name": "test", "description": "hello, world"}
    )
    response.raise_for_status()
    expected = response.json()
    assert expected["name"] == "test"
    assert expected["description"] == "hello, world"

    # Check
    response = client.get("/projects")
    response.raise_for_status()
    assert response.json() == [expected]

    # Delete
    response = client.delete(f"/project/{expected['id']}")
    response.raise_for_status()

    # Check again
    response = client.get("/projects")
    response.raise_for_status()
    assert response.json() == []


def test_create_and_make_public(client):
    # Create
    response = client.post(
        "/project", json={"name": "test", "description": "hello, world"}
    )
    response.raise_for_status()
    expected = response.json()
    assert expected["private"]

    # Switch
    response = client.put(f"/project/{expected['id']}/switch_publicity")
    response.raise_for_status()
    assert not response.json()["private"]

    # Check
    response = client.get("/projects")
    response.raise_for_status()
    assert not response.json()[0]["private"]

    # Switch back
    response = client.put(f"/project/{expected['id']}/switch_publicity")
    response.raise_for_status()
    assert response.json()["private"]

    # Check
    response = client.get("/projects")
    response.raise_for_status()
    assert response.json()[0]["private"]
