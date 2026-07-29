from acidwatch_models.base import BaseAdapter, BaseParameters, Parameter


class SolubilityCCSParameters(BaseParameters):
    flow_rate: float = Parameter(
        10,
        label="Flow rate",
        min=0.01,
        max=100,
        unit="Mt/year",
        description="Flow rate in Mt/year",
    )


class SolubilityCCSAdapter(BaseAdapter):
    model_id = "solubilityccs"
    display_name = "Solubility CCS"
    description = """\
Solubility model detects acid formation risks in CO2 streams.

It uses the SRK-CPA (Soave-Redlich-Kwong Cubic Plus Association) equation of
state to calculate fugacity coefficients and activity models to determine
component activities in multiphase systems.

The model currently supports the following chemical systems:

- CO₂-water (binary system)
- CO₂-water-H₂SO₄ (ternary system with sulfuric acid)
- CO₂-water-HNO₃ (ternary system with nitric acid)
"""
    valid_substances = ["H2O", "H2SO4", "HNO3"]
    parameters: SolubilityCCSParameters
    category = "PhaseEquilibrium"
