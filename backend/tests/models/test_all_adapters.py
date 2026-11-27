from __future__ import annotations
import importlib.util
import pytest
import re
from pathlib import Path
from acidwatch_worker_runtime import BaseAdapter

WORKERS = Path(__file__).parents[3] / "workers"


def _load_definitions() -> list[type[BaseAdapter]]:
    """Every model definition in the repository.

    Definitions live with their worker. ``definition.py`` only depends on the
    worker runtime, so it can be loaded here without the model's own
    (often heavy) dependencies.
    """
    definitions: list[type[BaseAdapter]] = []
    for path in sorted(WORKERS.glob("*/src/*/definition.py")):
        spec = importlib.util.spec_from_file_location(
            f"_definition_{path.parent.name}", path
        )
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        definitions.extend(
            value
            for value in vars(module).values()
            if isinstance(value, type)
            and issubclass(value, BaseAdapter)
            and value.__module__ == module.__name__
        )
    return definitions


ADAPTERS = _load_definitions()


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


def test_every_worker_has_a_definition():
    assert len(ADAPTERS) == len(list(WORKERS.glob("*/pyproject.toml")))


def test_model_ids_are_unique():
    # Nothing else stops two workers from announcing the same model
    model_ids = [adapter.model_id for adapter in ADAPTERS]
    assert len(model_ids) == len(set(model_ids))


@pytest.mark.parametrize("adapter", ADAPTERS)
def test_has_model_name(adapter: BaseAdapter):
    assert adapter.display_name.strip() != ""


@pytest.mark.parametrize("adapter", ADAPTERS)
def test_init_concs(adapter: BaseAdapter):
    for substance in adapter.valid_substances:
        _assert_is_valid_substance(substance)
