from acidwatch_models.base import BaseAdapter


DESCRIPTION = """\
Automated Reactions for CO2 Storage (ARCS) model.

ARCS combines first-principles calculations with Monte-Carlo sampling and
models possible reactions that may occur under a given set of conditions.
This process identifies the most frequently occurring reactions and paths,
final products, and expected concentrations.

This model is under significant development and is expected to change while
developed. Therefore a development version of it has been released while work
is ongoing.

Source code found [on GitHub (badw/arcs)](https://github.com/badw/arcs).
"""


class ArcsExpAdapter(BaseAdapter):
    model_id = "arcs_exp"
    display_name = "ARCS experimental"
    description = DESCRIPTION
    category = "ChemicalEquilibrium"
    valid_substances = [
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
