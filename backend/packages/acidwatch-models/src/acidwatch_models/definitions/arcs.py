from acidwatch_models.base import BaseAdapter


VALID_SUBSTANCES = [
    "CH2O2",
    "CH3CH2OH",
    "CO",
    "H2",
    "O2",
    "CH3COOH",
    "CH3OH",
    "CH4",
    "CH3CHO",
    "H2CO",
    "H2O",
    "H2SO4",
    "H2S",
    "S8",
    "SO2",
    "H2SO3",
    "HNO3",
    "NO2",
    "NH3",
    "HNO2",
    "NO",
    "N2",
    "NOHSO4",
]


class ArcsAdapter(BaseAdapter):
    model_id = "arcs"
    display_name = "ARCS"
    description = """\
Automated Reactions for CO2 Storage (ARCS) model.

ARCS combines first-principles calculations with Monte-Carlo sampling and
models possible reactions that may occur under a given set of conditions.
This process identifies the most frequently occurring reactions and paths,
final products, and expected concentrations.

Source code found [on GitHub (equinor/arcs)](https://github.com/equinor/arcs/tree/21ded96960d28d549c0950fbc1aa09c94159f652).
"""
    category = "ChemicalEquilibrium"
    valid_substances = VALID_SUBSTANCES
