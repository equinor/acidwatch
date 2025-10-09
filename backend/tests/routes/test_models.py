from enum import StrEnum

import pytest
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from acidwatch_api.models.base import BaseParameters, Parameter
from acidwatch_api.models.datamodel import JsonResult


def test_get_models(client):
    response = client.get("/models")
    assert response.status_code == 200
    assert len(response.json()) == 5


@pytest.mark.usefixtures("dummy_model")
def test_get_test_model(client):
    response = client.get("/models")
    response.raise_for_status()
    data = response.json()

    assert len(data) == 1
    assert data[0]["modelId"] == "dummy"


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

        response = client.get(f"/models/results/{simulation_id}")
        response.raise_for_status()
        assert response.json() == {
            "modelInput": {
                "modelId": dummy_model.model_id,
                "concentrations": expected_concs,
                "parameters": {},
            },
            "concentrations": expected_concs,
            "panels": [],
            "errors": None,
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

    response = client.get("/models")
    response.raise_for_status()

    assert response.json() == [
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
                    "choices": None,
                    "convertibleUnit": None,
                    "default": 0,
                    "description": None,
                    "label": None,
                    "optionLabels": None,
                    "title": "Somefield",
                    "type": "integer",
                    "unit": None,
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

        response = client.get(f"/models/results/{simulation_id}")
        response.raise_for_status()
        assert response.json() == {
            "modelInput": {
                "modelId": dummy_model.model_id,
                "concentrations": {},
                "parameters": expected,
            },
            "concentrations": {},
            "panels": [{"type": "json", "label": None, "data": expected}],
            "errors": None,
        }


def test_that_running_a_nonexistent_model_returns_404(client):
    resp = client.post(
        "/models/doesnt-exist/runs",
        json={
            "concentrations": {},
            "parameters": {},
        },
    )
    assert resp.status_code == 404


@pytest.mark.parametrize(
    "user", [(pytest.param(False, id="as-anonymous"), pytest.param(True, id="as-user"))]
)
def test_running_dummy_model_succeeds(client, user, dummy_user):
    client.current_user = dummy_user if user else None
    resp = client.post(
        "/models/dummy/runs",
        json={
            "concentrations": {},
            "parameters": {},
        },
    )
    resp.raise_for_status()
    scenario_id = resp.json()

    assert isinstance(scenario_id, str)

    resp = client.get(f"/models/results/{scenario_id}")
    resp.raise_for_status()

    result = resp.json()
    assert result["concentrations"] == {}
    assert result["panels"] == []
