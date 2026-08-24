from acidwatch_models.base import BaseAdapter, BaseParameters, Parameter


class SRKVanLaarParameters(BaseParameters):
    flow_rate: float = Parameter(
        10,
        label="Flow rate",
        min=0.01,
        max=100,
        unit="Mt/year",
        description="Flow rate in Mt/year",
    )


class SRKVanLaarAdapter(BaseAdapter):
    model_id = "srk_vanlaar"
    display_name = "SRK-VanLaar"
    description = """\
SRK-VanLaar model detects acid formation risks in CO2 streams.

It uses the SRK equation of state with Van Laar activity model in NeqSim to
calculate phase behavior and acid partitioning in multiphase systems.

The model currently supports the following chemical systems:

- CO₂-water (binary system)
- CO₂-water-H₂SO₄ (ternary system with sulfuric acid)
- CO₂-water-HNO₃ (ternary system with nitric acid)
"""
    valid_substances = ["H2O", "H2SO4", "HNO3", "O2", "NO2"]
    parameters: SRKVanLaarParameters
    category = "PhaseEquilibrium"
