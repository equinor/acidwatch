import pytest
from acidwatch_api.models.base import BaseAdapter
from acidwatch_api.models.datamodel import Phase


class DummyAdapter(BaseAdapter):
    model_id = "dummy"
    display_name = "Dummy"
    description = "test"
    category = "ChemicalEquilibrium"
    valid_substances = ["CO2", "HCl"]

    async def run(self):
        return []


@pytest.fixture
def adapter():
    a = DummyAdapter(parameters=None, jwt_token=None)
    return a


class TestSetConcentrations:
    def test_filters_to_valid_substances(self, adapter):
        adapter.set_concentrations({"CO2": 1.0, "HCl": 2.0, "H2O": 3.0})
        assert adapter.concentrations == {"CO2": 1.0, "HCl": 2.0}

    def test_defaults_missing_valid_substances_to_zero(self, adapter):
        adapter.set_concentrations({"CO2": 1.0, "H2O": 3.0})
        assert adapter.concentrations == {"CO2": 1.0, "HCl": 0.0}


class TestPassthroughConcentrations:
    @pytest.mark.parametrize(
        "input_concs,expected",
        [
            ({"CO2": 1.0, "HCl": 2.0}, {}),
            ({"CO2": 1.0, "H2O": 3.0}, {"H2O": 3.0}),
            ({"H2O": 3.0, "NaCl": 5.0}, {"H2O": 3.0, "NaCl": 5.0}),
        ],
        ids=[
            "all_handled",
            "one_unhandled",
            "all_unhandled",
        ],
    )
    def test_returns_unhandled_components(self, adapter, input_concs, expected):
        adapter.set_concentrations(input_concs)
        assert adapter.passthrough_concentrations == expected


class TestMergePassthrough:
    def test_no_passthrough_returns_phases_unchanged(self, adapter):
        adapter.set_concentrations({"CO2": 1.0, "HCl": 2.0})
        phases = [Phase(kind="co2-rich", fraction=1.0, concentrations={"CO2": 0.5})]
        result = adapter.merge_passthrough(phases)
        assert result is phases

    @pytest.mark.parametrize(
        "phase_kind,expect_merge",
        [
            ("co2-rich", True),
            ("aqueous", False),
        ],
    )
    def test_only_merges_into_co2_rich_phases(self, adapter, phase_kind, expect_merge):
        adapter.set_concentrations({"CO2": 1.0, "H2O": 3.0})
        phases = [Phase(kind=phase_kind, fraction=1.0, concentrations={"CO2": 0.5})]
        result = adapter.merge_passthrough(phases)
        if expect_merge:
            assert result[0].concentrations == {"CO2": 0.5, "H2O": 3.0}
        else:
            assert result[0].concentrations == {"CO2": 0.5}

    def test_model_output_takes_precedence_over_passthrough(self, adapter):
        adapter.set_concentrations({"CO2": 1.0, "H2O": 3.0, "NaCl": 7.0})
        phases = [
            Phase(
                kind="co2-rich", fraction=1.0, concentrations={"CO2": 0.5, "NaCl": 9.0}
            )
        ]
        result = adapter.merge_passthrough(phases)
        assert result[0].concentrations == {"CO2": 0.5, "H2O": 3.0, "NaCl": 9.0}

    def test_multiple_phases(self, adapter):
        adapter.set_concentrations({"CO2": 1.0, "H2O": 3.0})
        phases = [
            Phase(kind="co2-rich", fraction=0.7, concentrations={"CO2": 0.5}),
            Phase(kind="aqueous", fraction=0.3, concentrations={"CO2": 0.1}),
        ]
        result = adapter.merge_passthrough(phases)
        assert result[0].concentrations == {"CO2": 0.5, "H2O": 3.0}
        assert result[1].concentrations == {"CO2": 0.1}
