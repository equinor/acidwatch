from __future__ import annotations

from uuid import uuid4

import pytest
import jwt
from fastapi.testclient import TestClient
from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import User, get_optional_current_user


class CustomTestClient(TestClient):
    def __init__(self):
        super().__init__(fastapi_app)

        self.current_user: User | None = None
        fastapi_app.dependency_overrides[get_optional_current_user] = (
            self._fake_optional_current_user
        )

    def _fake_optional_current_user(self) -> User | None:
        return self.current_user


@pytest.fixture(scope="module")
def client():
    with CustomTestClient() as client:
        yield client


@pytest.fixture(scope="module")
def dummy_user() -> User:
    return User(
        id=uuid4(),
        name="Test User",
        principal_name="TEST@example.com",
        jwt_token=jwt.encode({"name": "Test User"}, "secret", algorithm="HS256"),
    )
