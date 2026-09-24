from acidwatch_models.base import BaseAdapter


DESCRIPTION = """\
### Automated Reactions for CO<sub>2</sub> Storage (ARCS)

ARCS is a Monte-Carlo sampled large equilibrium reaction network.

The reaction network is made up of all possible balanced equilibrium reactions using first-principles calculations (coupled cluster level of theory using Psi4 [psicode.org](https://psicode.org), *ccsd/cc-pvdz*) to form Gibbs Free energies and equilibrium constants as a function of temperature and pressure. 

The Monte-Carlo sampling utilises a random walk over the reaction network to identify the most frequently occuring reactions and updates the input concentrations accordingly. 

Source code found [on GitHub (badw/arcs)](https://github.com/badw/arcs)

Documentation (_under construction_) can be found at [badw.github.io/arcs](https://badw.github.io/arcs/)

<img src="/images/outer_loop_arcs.png" alt="ARCS outer loop" width=30% style="max-height:50%; width: auto;" />
"""


class ArcsExpAdapter(BaseAdapter):
    model_id = "arcs_exp"
    display_name = "ARCS 1.5.1"
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
