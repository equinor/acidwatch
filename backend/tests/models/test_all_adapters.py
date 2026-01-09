from __future__ import annotations
import pytest
import re
from acidwatch_api.models.base import ADAPTERS, BaseAdapter


ATOM_PATTERN = (
    "(A[cglmrstu]"
    "|B[aehikr]?"
    "|C[adeflmnorsu]?"
    "|D[bsy]"
    "|E[rsu]"
    "|F[elmr]?"
    "|G[ade]"
    "|H[efgos]?"
    "|I[nr]?"
    "|Kr?"
    "|L[airuv]"
    "|M[cdgnot]"
    "|N[abdehiop]?"
    "|O[gs]?"
    "|P[abdmortu]?"
    "|R[abefghnu]"
    "|S[bcegimnr]?"
    "|T[abcehilms]"
    "|U"
    "|V"
    "|W"
    "|Xe"
    "|Yb?"
    "|Z[nr])(\\d*)"
)


TOKENS = [
    ("ATOM", ATOM_PATTERN),
    ("OPEN", "\\("),
    ("CLOSE", "\\)(\\d*)"),
    ("INVALID", "."),
]


SUBSTANCE_PATTERN = re.compile(
    "|".join(f"(?P<{name}>{pattern})" for name, pattern in TOKENS)
)


def _assert_is_valid_substance(substance: str) -> None:
    assert substance

    groupdepth = 0
    for match in SUBSTANCE_PATTERN.finditer(substance):
        kind = match.lastgroup

        if kind == "ATOM":
            name = match[2]
            atom = int(match[3] or "1")

            assert atom > 0, f"In {substance}, element {name} must have non-zero atoms"
        elif kind == "OPEN":
            groupdepth += 1
        elif kind == "CLOSE":
            mult = int(match[6] or "1")
            groupdepth -= 1
            assert mult > 1, f"In {substance}, group multiplier must be greater than 1"
        else:
            raise AssertionError(f"Unexpected character '{match[0]}'")

    assert groupdepth == 0, f"In {substance}, groups must be closed"


@pytest.mark.parametrize(
    "substance",
    [
        "H2O",
        "H2",
        "CH(CH3)3",
    ],
)
def test_sanity_check_good(substance):
    _assert_is_valid_substance(substance)


@pytest.mark.parametrize(
    "substance",
    [
        "",
        "H0",
        "water",
        "1234",
        "CH(",
        "CH(CH3)0",
        "CH(CH3)",
    ],
)
def test_sanity_check_bad(substance):
    with pytest.raises(AssertionError):
        _assert_is_valid_substance(substance)


@pytest.mark.parametrize("adapter", ADAPTERS.values())
def test_has_model_name(adapter: BaseAdapter):
    assert adapter.display_name.strip() != ""


@pytest.mark.parametrize("adapter", ADAPTERS.values())
def test_init_concs(adapter: BaseAdapter):
    for substance in adapter.valid_substances:
        assert (
            substance != "CO2"
        ), "CO2 is assumed to be the solvent in every model, so it must not be specified"
        _assert_is_valid_substance(substance)
