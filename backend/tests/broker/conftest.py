"""Shared fixtures for the broker/heartbeat test suite.

Mirrors the ``client``/``sql_session`` fixtures already used in
``tests/test_models_endpoints.py`` so the timeout-detection and
heartbeat-status endpoint tests can drive the API the same way the rest of
the test suite does.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient as _BaseTestClient

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims


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
