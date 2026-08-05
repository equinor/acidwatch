from enum import StrEnum

from acidwatch_models.base import BaseAdapter, BaseParameters, Parameter


NOT_INITIALIZED_BY_DEFAULT = ["H2", "N2O3", "N2", "N2H4", "COS", "NH3"]

INITIALIZED_BY_DEFAULT = [
    "H2O",
    "SO2",
    "SO3",
    "NO2",
    "NO",
    "H2S",
    "O2",
    "H2SO4",
    "HNO3",
    "S8",
    "CH4",
    "H2O",
    "O2",
    "H2SO4",
    "NH4NO3",
    "NH4HSO4",
    "CH2O2",
    "CH3COOH",
    "CH3OH",
    "CH4",
    "CO",
    "CH3CH2OH",
    "CO",
    "HOCH2CH2OH",
    "(CH2CH2OH)2O",
    "HOCH2(CH2CH2O)2CH2OH",
    "H2NCH2CH2OH",
    "CH3N(C2H4OH)2",
    "(CH2CH2OH)2NH",
    "CH3CH3",
    "CH3CH2CH3",
    "(CH3)2CHCH3",
    "CH3CH2CH2CH3",
    "CH3(CH2)3CH3",
    "C6H5CH3",
    "C6H4(CH3)2",
    "HCN",
    "CS2",
    "Ar",
    "CH2O",
    "C2H4O",
    "C2H4",
    "CH3CHO",
]


class EquationOfState(StrEnum):
    SRK = "SRK"
    PR = "PR"
    SRKCPA = "SRKCPA"
    IdealGas = "IG"


class GibbsMinimizationModelParameters(BaseParameters):
    equation_of_state: EquationOfState = Parameter(
        EquationOfState.SRK,
        label="Equation of State",
        option_labels=[
            "Soave-Redlich-Kwong (SRK)",
            "Peng-Robinson (PR)",
            "SRK cubic + association",
            "Ideal Gas",
        ],
    )


class GibbsMinimizationModelAdapter(BaseAdapter):
    model_id = "gibbs_minimization"
    display_name = "Gibbs Minimization Model"
    description = """\
The model's primary advantage lies in its ability to analyze complex systems,
such as CO2 with impurities, without the need to specify individual reactions.
By focusing only on the thermodynamic principles that govern the system's
behavior, it identifies the stable state corresponding to the minimum total
Gibbs free energy at given temperature and pressure.

However, the model also has limitations. It requires the input of all possible
species that could form from the elements present; missing any potential
species may lead to incorrect equilibrium calculations (that does not
necessarily mean a poor description of the real case scenario). Additionally,
the model does not account for kinetics or activation energy, which are crucial
for understanding the speed of reactions and the energy barriers that must be
overcome for reactions to occur. As a result, while the model can predict the
equilibrium state, it cannot guarantee that the real CO2-with-impurities system
actually reaches that state.

The model uses the [neqsim](https://github.com/equinor/neqsim) library for the
fluid description (EOS).
"""
    valid_substances = INITIALIZED_BY_DEFAULT + NOT_INITIALIZED_BY_DEFAULT
    parameters: GibbsMinimizationModelParameters
    category = "ChemicalEquilibrium"
