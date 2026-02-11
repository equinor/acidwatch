from enum import StrEnum

from acidwatch_api.routes.models import get_adapters
import pytest
from fastapi.testclient import TestClient as _BaseTestClient
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from acidwatch_api.app import fastapi_app
from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models import base
from acidwatch_api.models.base import BaseParameters, Parameter
from acidwatch_api.models.datamodel import JsonResult
import acidwatch_api.database as db


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


def test_get_models(client):
    response = client.get("/models")
    assert response.status_code == 200
    assert len(response.json()) == 5


class DummyAdapter(base.BaseAdapter):
    model_id = "dummy"
    display_name = "Dummy Model"
    description = ""
    category = "Primary"
    valid_substances = ["H2O"]

    async def run(self):
        return {key: value / 2 for key, value in self.concentrations.items()}


class SecondDummyAdapter(base.BaseAdapter):
    model_id = "dummy_2"
    display_name = "Dummy Model"
    description = ""
    category = "Secondary"
    valid_substances = ["H2O"]

    async def run(self):
        return {key: value * 4 for key, value in self.concentrations.items()}


class FailingDummyAdapter(base.BaseAdapter):
    model_id = "failing_dummy"
    display_name = "Failing Dummy Model"
    description = ""
    category = "Primary"
    valid_substances = ["H2O"]

    async def run(self):
        raise RuntimeError("Intentional failure for testing")


@pytest.fixture
def dummy_model(client):
    client.app.dependency_overrides[get_adapters] = lambda: {
        DummyAdapter.model_id: DummyAdapter,
    }
    return DummyAdapter


@pytest.fixture
def dummy_models(client):
    client.app.dependency_overrides[get_adapters] = lambda: {
        DummyAdapter.model_id: DummyAdapter,
        SecondDummyAdapter.model_id: SecondDummyAdapter,
        FailingDummyAdapter.model_id: FailingDummyAdapter,
    }
    return DummyAdapter


@pytest.mark.usefixtures("dummy_models")
def test_get_test_model(client):
    response = client.get_json("/models")

    assert len(response) == 3
    assert response[0]["modelId"] == "dummy"


@pytest.mark.parametrize(
    "valid_substances,concentrations,expected_concs",
    [
        (["H2"], {"H2": 10}, {"H2": 5.0}),
        ([], {"H2": 10}, ("H2", "Extra inputs are not permitted")),
        (["H2"], {}, {"H2": 0.0}),
    ],
)
def test_dummy_model_only_valid_substances_are_present(
    client, dummy_model, monkeypatch, valid_substances, concentrations, expected_concs
):
    monkeypatch.setattr(dummy_model, "valid_substances", valid_substances)
    simulation = {
        "concentrations": concentrations,
        "models": [{"modelId": dummy_model.model_id, "parameters": {}}],
    }
    response = client.post(
        "/simulations/",
        json=simulation,
    )
    if isinstance(expected_concs, tuple):
        which, what = expected_concs
        assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY

        assert response.json() == {"detail": {"concentrations": {which: [what]}}}
    else:
        response.raise_for_status()
        simulation_id = response.json()

        response = client.get(f"/simulations/{simulation_id}/result")
        assert response.json() == {
            "status": "done",
            "input": simulation,
            "results": [{"concentrations": expected_concs, "panels": []}],
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
            "category": "Primary",
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
            "validSubstances": ["H2O"],
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
        "/simulations/",
        json={
            "concentrations": {},
            "models": [
                {"modelId": dummy_model.model_id, "parameters": input_parameters}
            ],
        },
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
            "input": {
                "concentrations": {},
                "models": [
                    {
                        "modelId": dummy_model.model_id,
                        "parameters": input_parameters,
                    }
                ],
            },
            "results": [
                {
                    "concentrations": {"H2O": 0.0},
                    "panels": [
                        {
                            "type": "json",
                            "label": None,
                            "data": expected,
                        }
                    ],
                }
            ],
        }


def test_running_empty_list_of_models_is_an_error(client):
    response = client.post(
        "/simulations",
        json={"concentrations": {"H2O": 2.0}, "models": []},
    )
    assert response.status_code == 422


@pytest.mark.usefixtures("dummy_models")
@pytest.mark.parametrize(
    "input_models, result_concentrations",
    [
        pytest.param(
            [{"modelId": "dummy", "parameters": {}}],
            [{"H2O": 0.5}],
            id="single model",
        ),
        pytest.param(
            [
                {"modelId": "dummy", "parameters": {}},
                {"modelId": "dummy", "parameters": {}},
            ],
            [{"H2O": 0.5}, {"H2O": 0.25}],
            id="two models",
        ),
        pytest.param(
            [
                {"modelId": "dummy", "parameters": {}},
                {"modelId": "dummy_2", "parameters": {}},
            ],
            [{"H2O": 0.5}, {"H2O": 2.0}],
            id="two models different adapters",
        ),
    ],
)
def test_running_models(client, input_models, result_concentrations):
    simulation_input = {
        "concentrations": {"H2O": 1},
        "models": input_models,
    }

    response = client.post(
        "/simulations",
        json=simulation_input,
    )

    response.raise_for_status()

    simulation_id = response.json()

    response = client.get(f"/simulations/{simulation_id}/result")
    response.raise_for_status()

    assert response.json() == {
        "status": "done",
        "input": simulation_input,
        "results": [{"concentrations": x, "panels": []} for x in result_concentrations],
    }


@pytest.mark.parametrize(
    "input_models,result",
    [
        pytest.param(
            [
                {"modelId": "failing_dummy", "parameters": {}},
                {"modelId": "dummy", "parameters": {}},
            ],
            [{"H2O": 0.5}, {"H2O": 0.25}],
            id="failing model first",
        ),
        pytest.param(
            [
                {"modelId": "dummy", "parameters": {}},
                {"modelId": "failing_dummy", "parameters": {}},
            ],
            [{"H2O": 0.5}, {"H2O": 0.25}],
            id="failing model second",
        ),
    ],
)
def test_failing_model(client, input_models, result):
    simulation_input = {
        "concentrations": {"H2O": 1},
        "models": input_models,
    }

    response = client.post(
        "/simulations",
        json=simulation_input,
    )

    response.raise_for_status()

    simulation_id = response.json()

    response = client.get(f"/simulations/{simulation_id}/result")
    assert response.status_code == 500
    assert "Intentional failure for testing" in response.text


@pytest.mark.parametrize(
    "swap",
    [
        pytest.param(False, id="insertion order"),
        pytest.param(True, id="reverse order"),
    ],
)
def test_results_order(client, sql_session, swap):
    first_model = {"modelId": "first_model", "parameters": {}}
    second_model = {"modelId": "second_model", "parameters": {}}
    first_result = {"concentrations": {"A": 1}, "panels": []}
    second_result = {"concentrations": {"B": 2}, "panels": []}
    first = 0
    second = 1

    if swap:
        first_model, second_model = second_model, first_model
        first_result, second_result = second_result, first_result
        first, second = second, first

    simulation = db.Simulation(
        owner_id=None,
        concentrations={},
        model_inputs=[
            db.ModelInput(
                model_id="first_model",
                parameters={},
                result=db.ModelResult(
                    concentrations={"A": 1},
                    panels=[],
                    python_exception=None,
                    error=None,
                ),
            ),
            db.ModelInput(
                model_id="second_model",
                parameters={},
                result=db.ModelResult(
                    concentrations={"B": 2},
                    panels=[],
                    python_exception=None,
                    error=None,
                ),
            ),
        ],
    )

    with sql_session() as session:
        session.add(simulation)
        session.commit()

        simulation.model_inputs[
            second
        ].previous_model_input_id = simulation.model_inputs[first].id
        session.commit()

    response = client.get(f"/simulations/{simulation.id}/result")
    response.raise_for_status()

    assert response.json() == {
        "status": "done",
        "input": {"concentrations": {}, "models": [first_model, second_model]},
        "results": [first_result, second_result],
    }
