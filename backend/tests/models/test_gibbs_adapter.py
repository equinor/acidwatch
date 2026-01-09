from acidwatch_api.models.gibbs_minimization_model import (
    GibbsMinimizationModelAdapter,
    _EquationOfState,
    NOT_INITIALIZED_BY_DEFAULT,
    INITIALIZED_BY_DEFAULT,
)
import pytest
from neqsim import jneqsim
from unittest.mock import MagicMock


class MockFluid(MagicMock):
    @staticmethod
    def getNumberOfPhases():
        return 1


class MockStream(MagicMock):
    @staticmethod
    def getFluid():
        return MockFluid()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "concentrations",
    [
        ({"H2O": 1.1}),
        (
            {NOT_INITIALIZED_BY_DEFAULT[0]: 1.2}
        ),  # This, and only this, component should be added from the "NOT_INITIALIZED_BY_DEFAULT"
        ({NOT_INITIALIZED_BY_DEFAULT[0]: 1.2, INITIALIZED_BY_DEFAULT[2]: 1.2}),
    ],
)
async def test_only_allowed_components_are_added_by_default(
    monkeypatch, concentrations
):
    # Arrange
    mocked_system = MagicMock()
    mocked_reactor = MagicMock()

    def mock_stream(*args, **kwargs):
        return MockStream()

    def mock_system_call(*args, **kwargs):
        return mocked_system

    monkeypatch.setattr(jneqsim.thermo.system, "SystemSrkEos", mock_system_call)
    monkeypatch.setattr(jneqsim.process.equipment.stream, "Stream", mock_stream)
    monkeypatch.setattr(
        jneqsim.process.equipment.reactor, "GibbsReactor", mocked_reactor
    )

    parameters = {
        "temperature": 250,
        "pressure": 10,
        "equation_of_state": _EquationOfState.SRK,
    }

    # Act
    adapter = GibbsMinimizationModelAdapter(
        concentrations=concentrations, parameters=parameters, jwt_token=None
    )

    await adapter.run()

    added = [x.args[0] for x in mocked_system.addComponent.call_args_list]
    # Assert
    for comp in NOT_INITIALIZED_BY_DEFAULT:
        if comp in concentrations.keys():
            continue

        name = GibbsMinimizationModelAdapter.formula_to_neqsim.get(comp, comp)
        assert name not in added, f"{name} should not be added, but was still found"

    arglist = [x.args for x in mocked_system.addComponent.call_args_list]
    for comp, value in concentrations.items():
        name = GibbsMinimizationModelAdapter.formula_to_neqsim.get(comp, comp)
        assert (
            name,
            value,
            "mole/sec",
        ) in arglist, f"Did not find {name} to be added to the arglist: {arglist}"


def test_no_overlapping_substances():
    intersection = set(NOT_INITIALIZED_BY_DEFAULT) & set(INITIALIZED_BY_DEFAULT)
    assert (
        len(intersection) == 0
    ), f"The lists in gibbs adapter should have no overlap, found {intersection} in both lists"
