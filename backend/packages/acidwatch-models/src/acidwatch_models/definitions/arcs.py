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
### Legacy Version of Automated Reactions for CO<sub>2</sub> Storage (ARCS)

** The latest version can be found under ARCS 1.5.1 **

```
ARCS 1.5.1 includes: 
    - coupled cluster _ab initio_ calculated database
    - more compounds (44 compounds) 
    - faster algorithm
```

ARCS is a Monte-Carlo sampled large equilibrium reaction network.

The reaction network is made up of all possible balanced equilibrium reactions using first-principles calculations (using density functional theory with the [VASP code](https://vasp.at), SCAN functional) to form Gibbs Free energies and equilibrium constants as a function of temperature and pressure.

The Monte-Carlo sampling utilises a random walk over the reaction network to identify the most frequently occuring reactions and updates the input concentrations accordingly.

Source code found [on GitHub (equinor/arcs)](https://github.com/equinor/arcs/tree/21ded96960d28d549c0950fbc1aa09c94159f652).
"""
    category = "ChemicalEquilibrium"
    valid_substances = VALID_SUBSTANCES
