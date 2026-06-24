from __future__ import annotations
from acidwatch_api.models.base import BaseAdapter, InputError, RunResult
from acidwatch_api.models.datamodel import Phase
from ccstoolkit import eqstreamcomp

DESCRIPTION = """
Computational model from Queen Mary University of London for calculating equilibrium composition of dense CO2 streams.

Based on the paper R. I. Slavchov, M. H. Iqbal, S. Faraji, D. Madden, J. Sonke, S. M. Clarke (2024). Corrosion maps: Stability and composition diagrams for corrosion problems in CO2 transport. *Corrosion Science, 236*, 112204.

The soirce code can be found at https://github.com/bipeychev/ccstoolkit.
"""

# Valid input ranges (in ppmx) expected by ccstoolkit's get_composition.
# These mirror the model's internal ``_domain`` and are used to build a helpful
# error message when get_composition rejects the input (it returns -1).
_VALID_RANGES = {
    "O2": (1, 200),
    "H2O": (1, 200),
    "H2S": (1, 100),
    "SO2": (1, 100),
    "NO2": (1, 200),
}

class CCStoolkitAdapter(BaseAdapter):
    model_id = "ccstoolkit"
    display_name = "ccstoolkit"
    description = DESCRIPTION
    category = "Reactive"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = False

    async def run(self) -> RunResult:
        temperature = self.conditions.temperature + 273
        # ccstoolkit.get_composition selects its calculation branch by checking
        # for the exact, case-sensitive species keys ("H2O", "H2S", "O2",
        # "NO2", "SO2"). The keys must therefore keep their original casing -
        # lower-casing them makes get_composition fall through to its error
        # branch and return the sentinel -1.
        p0: dict[str, float] = dict(self.concentrations)
        p0["tot"] = 18.55e3
        p0["T"] = temperature
        comp_p0 = eqstreamcomp.get_composition(
            p0, options={"maxiter": 10000, "maxfev": 10000}
        )
        # get_composition returns -1 (an int) instead of raising when the input
        # is invalid - e.g. a species is outside its valid range. Without this
        # guard the -1 is passed to Phase(concentrations=...) and surfaces as a
        # confusing pydantic "Input should be a valid dictionary" error.
        if not isinstance(comp_p0, dict):
            ranges = ", ".join(
                f"{subst} {lo}-{hi} ppmx" for subst, (lo, hi) in _VALID_RANGES.items()
            )
            raise InputError(
                {
                    "concentrations": {
                        subst: [
                            "ccstoolkit rejected the input. Each species must be "
                            f"within its valid range ({ranges}) and temperature "
                            "within -50..100 °C."
                        ]
                        for subst in self.valid_substances
                    }
                }
            )
        return [
            Phase(kind="co2-rich", fraction=1.0, concentrations=comp_p0),
        ]
