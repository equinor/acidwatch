from __future__ import annotations
import pytest
import re
from acidwatch_api.models.base import ADAPTERS, BaseAdapter


SUBSTANCE_PATTERN = re.compile(
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


def _assert_is_valid_substance(substance: str) -> None:
    for match in SUBSTANCE_PATTERN.finditer(substance):
        if match[2]:
            atom = int(match[2])
            assert atom > 0, (
                f"In {substance}, element {match[1]} must have non-zero atoms"
            )


@pytest.mark.parametrize("adapter", ADAPTERS)
def test_has_model_name(adapter: BaseAdapter):
    assert adapter.model_name().strip() != ""


@pytest.mark.parametrize("adapter", ADAPTERS)
def test_init_concs(adapter: BaseAdapter):
    for substance, amount in adapter.init_concs().items():
        assert substance != "CO2", (
            "CO2 is assumed to be the solvent in every model, so it must not be specified"
        )
        _assert_is_valid_substance(substance)
        assert (isinstance(amount, (float, int)) and amount >= 0) or amount is None, (
            f"Default concentration for {substance} must be a non-negative float or None"
        )
