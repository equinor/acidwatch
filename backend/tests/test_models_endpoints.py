from fastapi.testclient import TestClient

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims


def override_authenticated_user_claims():
    return {
        "oid": "the_oid",
        "upn": "theauthenticateduser@equinor.com",
        "roles": [],
    }


fastapi_app.dependency_overrides[authenticated_user_claims] = (
    override_authenticated_user_claims
)


def test_get_models():
    client = TestClient(fastapi_app)
    response = client.get("/models")
    assert response.status_code == 200
    assert len(response.json()) == 2
