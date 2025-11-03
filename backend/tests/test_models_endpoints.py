from enum import StrEnum

import pytest
from fastapi.testclient import TestClient as _BaseTestClient
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models import base
from acidwatch_api.models.base import BaseParameters, Parameter
from acidwatch_api.models.datamodel import JsonResult


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
    return TestClient(fastapi_app)


def test_get_models(client):
    response = client.get("/models")
    assert response.status_code == 200
    assert len(response.json()) == 6


class DummyAdapter(base.BaseAdapter):
    model_id = "dummy"
    display_name = "Dummy Model"
    description = ""
    category = "Dummy"
    valid_substances = []

    async def run(self):
        return self.concentrations


@pytest.fixture
def dummy_model(monkeypatch):
    monkeypatch.setattr(base, "ADAPTERS", {DummyAdapter.model_id: DummyAdapter})
    return DummyAdapter


@pytest.mark.usefixtures("dummy_model")
def test_get_test_model(client):
    response = client.get_json("/models")

    assert len(response) == 1
    assert response[0]["modelId"] == "dummy"


def test_run_test_model(client, dummy_model):
    response = client.post(
        f"/models/{dummy_model.model_id}/runs",
        json={
            "concentrations": {},
            "parameters": {},
        },
    )
    response.raise_for_status()
    simulation_id: str = response.json()

    response = client.get(f"/simulations/{simulation_id}/result")
    response.raise_for_status()

    assert response.json() == {
        "status": "done",
        "modelInput": {
            "modelId": dummy_model.model_id,
            "parameters": {},
            "concentrations": {},
        },
        "finalConcentrations": {},
        "panels": [],
    }


@pytest.mark.parametrize(
    "valid_substances,concentrations,expected_concs",
    [
        (["H2"], {"H2": 10}, {"H2": 10}),
        ([], {"H2": 10}, ("H2", "Extra inputs are not permitted")),
        (["H2"], {}, {"H2": 0.0}),
    ],
)
def test_dummy_model_only_valid_substances_are_present(
    client, dummy_model, monkeypatch, valid_substances, concentrations, expected_concs
):
    monkeypatch.setattr(dummy_model, "valid_substances", valid_substances)

    response = client.post(
        f"/models/{dummy_model.model_id}/runs",
        json={
            "concentrations": concentrations,
            "parameters": {},
        },
    )

    if isinstance(expected_concs, tuple):
        which, what = expected_concs
        assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY

        assert response.json() == {
            "detail": {"concentrations": {which: [what]}, "parameters": {}}
        }
    else:
        response.raise_for_status()
        simulation_id = response.json()

        response = client.get(f"/simulations/{simulation_id}/result")
        assert response.json() == {
            "status": "done",
            "modelInput": {
                "modelId": dummy_model.model_id,
                "concentrations": concentrations,
                "parameters": {},
            },
            "finalConcentrations": expected_concs,
            "panels": [],
        }


class _DummyModelParameters(BaseParameters):
    some_field: int = Parameter(0)


class _DummyModelParametersMinMax(BaseParameters):
    some_field: int = Parameter(0, min=-5, max=5)


class _DummyModelParametersString(BaseParameters):
    some_field: str = Parameter("some_value")


class _DummyModelParametersStringWithChoices(BaseParameters):
    some_field: str = Parameter("foo", choices=["foo", "bar", "baz"])


class _DummyEnum(StrEnum):
    FOO = "foo"
    BAR = "bar"


class _DummyModelParametersEnum(BaseParameters):
    some_field: _DummyEnum = Parameter(_DummyEnum.FOO)


def test_dummy_has_correct_parameter_name(client, monkeypatch, dummy_model):
    async def run(self):
        return self.concentrations, JsonResult(data=self.parameters)

    monkeypatch.setitem(
        dummy_model.__annotations__, "parameters", _DummyModelParameters
    )
    monkeypatch.setattr(dummy_model, "run", run)

    response = client.get_json("/models")

    assert response == [
        {
            "accessError": None,
            "displayName": "Dummy Model",
            "description": "",
            "category": "Dummy",
            "modelId": "dummy",
            "parameters": {
                # Notice that it's "someField" and not "some_field"
                "someField": {
                    "__type__": "AcidwatchParameter",
                    "default": 0,
                    "title": "Somefield",
                    "type": "integer",
                }
            },
            "validSubstances": [],
        }
    ]


@pytest.mark.parametrize(
    "parameters_class,input_parameters,expected",
    [
        pytest.param(
            None,
            {"someField": 123},
            ("someField", "Extra inputs are not permitted"),
            id="no params defined",
        ),
        pytest.param(
            _DummyModelParameters,
            {"someField": 123},
            {"someField": 123},
            id="valid camel case param",
        ),
        pytest.param(_DummyModelParameters, {}, {"someField": 0}, id="default value"),
        pytest.param(
            _DummyModelParameters,
            {"some_field": 123},
            {"someField": 123},
            id="valid snake case param",
        ),
        pytest.param(
            _DummyModelParameters,
            {"someOtherField": 123},
            ("someOtherField", "Extra inputs are not permitted"),
            id="non-existent param",
        ),
        pytest.param(
            _DummyModelParametersMinMax,
            {"someField": -100},
            ("someField", "Input should be greater than or equal to -5"),
            id="min",
        ),
        pytest.param(
            _DummyModelParametersMinMax,
            {"someField": 100},
            ("someField", "Input should be less than or equal to 5"),
            id="max",
        ),
        pytest.param(
            _DummyModelParametersString,
            {"someField": 0},
            ("someField", "Input should be a valid string"),
            id="passing an integer to a string parameter",
        ),
        pytest.param(
            _DummyModelParametersString,
            {},
            {"someField": "some_value"},
            id="valid default for a string parameter",
        ),
        pytest.param(
            _DummyModelParametersString,
            {"someField": "foobar"},
            {"someField": "foobar"},
            id="valid string to a string parameter",
        ),
        pytest.param(
            _DummyModelParametersStringWithChoices,
            {"someField": "foobar"},
            ("someField", "Value error, must be one of: ['foo', 'bar', 'baz']"),
            id="invalid choice in choice string",
        ),
        pytest.param(
            _DummyModelParametersEnum,
            {"someField": "bar"},
            {"someField": "bar"},
            id="valid choice in enum",
        ),
        pytest.param(
            _DummyModelParametersEnum,
            {"someField": "foobar"},
            ("someField", "Input should be 'foo' or 'bar'"),
            id="invalid choice in enum",
        ),
    ],
)
def test_dummy_model_only_valid_parameters_are_present(
    client, monkeypatch, dummy_model, parameters_class, input_parameters, expected
):
    async def run(self):
        return self.concentrations, JsonResult(data=self.parameters)

    if parameters_class is not None:
        monkeypatch.setitem(dummy_model.__annotations__, "parameters", parameters_class)
    monkeypatch.setattr(dummy_model, "run", run)

    response = client.post(
        f"/models/{dummy_model.model_id}/runs",
        json={"concentrations": {}, "parameters": input_parameters},
    )

    if isinstance(expected, tuple):
        where, what = expected
        assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
        assert response.json() == {
            "detail": {"concentrations": {}, "parameters": {where: [what]}},
        }
    else:
        response.raise_for_status()
        simulation_id = response.json()

        response = client.get(f"/simulations/{simulation_id}/result")
        response.raise_for_status()

        assert response.json() == {
            "status": "done",
            "modelInput": {
                "modelId": dummy_model.model_id,
                "concentrations": {},
                "parameters": input_parameters,
            },
            "finalConcentrations": {},
            "panels": [{"type": "json", "label": None, "data": expected}],
        }
