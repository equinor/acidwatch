from __future__ import annotations
from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    InputError,
    Parameter,
    RunResult,
)
from acidwatch_api.models.datamodel import Phase
from ccstoolkit import eqstreamcomp

DESCRIPTION = """
Computational model from Queen Mary University of London for calculating equilibrium composition of dense CO2 streams.

Based on the paper R. I. Slavchov, M. H. Iqbal, S. Faraji, D. Madden, J. Sonke, S. M. Clarke (2024). Corrosion maps: Stability and composition diagrams for corrosion problems in CO2 transport. *Corrosion Science, 236*, 112204.

The source code can be found at https://github.com/bipeychev/ccstoolkit.
"""


class CCStoolkitAdapter(BaseAdapter):
    model_id = "ccstoolkit"
    display_name = "ccstoolkit"
    description = DESCRIPTION
    category = "ChemicalEquilibrium"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    # Valid input domain for user-provided concentrations, in ppmx.
    # These are the bounds the underlying ccstoolkit model is validated for.
    _domain = {
        "H2O": {"min": 1, "max": 200},  # [ppmx]
        "H2S": {"min": 1, "max": 100},  # [ppmx]
        "NO2": {"min": 1, "max": 200},  # [ppmx]
        "O2": {"min": 1, "max": 200},  # [ppmx]
        "SO2": {"min": 1, "max": 100},  # [ppmx]
    }

    authentication = False

    def validate_concentrations(self, value: dict[str, float | int]) -> None:
        # First run the base whitelist check (rejects unknown substances).
        super().validate_concentrations(value)

        errors: dict[str, list[str]] = {}
        for subst, amount in value.items():
            bounds = self._domain.get(subst)
            if bounds is None:
                continue
            if amount < bounds["min"]:
                errors.setdefault(subst, []).append(
                    f"must be >= {bounds['min']} ppm"
                )
            if amount > bounds["max"]:
                errors.setdefault(subst, []).append(
                    f"must be <= {bounds['max']} ppm"
                )

        if errors:
            raise InputError({"concentrations": errors})

    async def run(self) -> RunResult:
        temperature = self.conditions.temperature + 273
        p0 = {key.upper(): value for key, value in self.concentrations.items()}
        p0['tot'] = 18.55e3
        p0['T'] = temperature
        comp_p0 = eqstreamcomp.get_composition(p0, options={'maxiter': 10000, 'maxfev': 10000})
        return [
            Phase(kind="co2-rich", fraction=1.0, concentrations={key: value/18.55e3*1e6 for key, value in comp_p0.items() if key != 'T' and key != 'tot'}),
        ]
