from acidwatch_models.base import BaseAdapter, InputError


DESCRIPTION = """\
Computational model from Queen Mary University of London for calculating \
equilibrium composition of dense CO2 streams.

Based on the paper R. I. Slavchov, M. H. Iqbal, S. Faraji, D. Madden, \
J. Sonke, S. M. Clarke (2024). Corrosion maps: Stability and composition \
diagrams for corrosion problems in CO2 transport. *Corrosion Science, 236*, \
112204.

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

    _domain = {
        "H2O": {"min": 1, "max": 200},
        "H2S": {"min": 1, "max": 100},
        "NO2": {"min": 1, "max": 200},
        "O2": {"min": 1, "max": 200},
        "SO2": {"min": 1, "max": 100},
    }

    def validate_concentrations(self, value: dict[str, float | int]) -> None:
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
