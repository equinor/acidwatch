from neqsim import jneqsim
from enum import StrEnum
from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)

# Model constants
# Damping factor for composition convergence in Gibbs reactor
DAMPING_COMPOSITION = 0.05  # Used for reactor.setDampingComposition()
# Maximum number of iterations for Gibbs reactor convergence
MAX_ITERATIONS = 5000  # Used for reactor.setMaxIterations()
# Convergence tolerance for Gibbs reactor
CONVERGENCE_TOLERANCE = 1e-3  # Used for reactor.setConvergenceTolerance()


NOT_INITIALIZED_BY_DEFAULT = [
    "H2",
    "N2O3",
    "N2O",
    "N2",
    "N2H4",
    "COS",
    "NH3",
]

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
    #  benzene
    # "i-pentane"
]

DESCRIPTION: str = """The model's primary advantage lies in its ability to analyze complex systems, such as CO2 with impurities, without the need to specify individual reactions. By focusing only on the thermodynamic principles that govern the system's behavior, it identifies the stable state corresponding to the minimum total Gibbs free energy at given temperature and pressure.

However, the model also has limitations. It requires the input of all possible species that could form from the elements present missing any potential species may lead to incorrect equilibrium calculations (that is does not necessary mean poor description of real case scenario). Additionally, the model does not account for kinetics or activation energy, which are crucial for understanding the speed of reactions and the energy barriers that must be overcome for reactions to occur. As a result, while the model can predict the equilibrium state, it cannot guarantee that the real CO2 with impurities system actually reach that state.

The model uses neqsim library for the fluid description (EOS)."""


class _EquationOfState(StrEnum):
    SRK = "SRK"
    PR = "PR"
    SRKCPA = "SRKCPA"
    IdealGas = "IG"


class GibbsMinimizationModelParameters(BaseParameters):
    temperature: int = Parameter(
        298,
        label="Temperature",
        unit=Unit.TEMPERATURE_KELVIN,
        min=200,
        max=450,
    )
    pressure: int = Parameter(
        100,
        label="Pressure",
        unit="bara",
        min=1,
        max=300,
    )
    equation_of_state: _EquationOfState = Parameter(
        _EquationOfState.SRK,
        label="Equation of State",
        option_labels=[
            "Soave-Redlich-Kwong (SRK)",
            "Peng-Robinson (PR)",
            "SRK cubic + association",
            "Ideal Gas",
        ],
    )


class GibbsMinimizationModelAdapter(BaseAdapter):
    valid_substances = INITIALIZED_BY_DEFAULT + NOT_INITIALIZED_BY_DEFAULT

    # Map formulas to neqsim names
    formula_to_neqsim = {
        "H2O": "water",
        "O2": "oxygen",
        "H2SO4": "sulfuric acid",
        "HNO3": "nitric acid",
        "CH4": "methane",
        "Ar": "argon",
        "CH2O2": "formic acid",
        "H2": "hydrogen",
        "CH3COOH": "acetic acid",
        "CH3OH": "methanol",
        "CH3CHO": "C2H4O",
        "H2CO": "CH2O",
        "NH3": "ammonia",
        "N2": "nitrogen",
        "CH3CH2OH": "ethanol",
        "HOCH2CH2OH": "MEG",
        "(CH2CH2OH)2O": "DEG",
        "HOCH2(CH2CH2O)2CH2OH": "TEG",
        "H2NCH2CH2OH": "MEA",
        "CH3N(C2H4OH)2": "MDEA",
        "(CH2CH2OH)2NH": "DEA",
        "CH3CH3": "ethane",
        "CH3CH2CH3": "propane",
        "(CH3)2CHCH3": "i-butane",
        "CH3CH2CH2CH3": "n-butane",
        "CH3(CH2)3CH3": "n-pentane",
        "C6H5CH3": "toluene",
        "C6H4(CH3)2": "o-Xylene",
    }

    model_id = "gibbs_minimization"
    display_name = "Gibbs Minimization Model"
    parameters: GibbsMinimizationModelParameters
    description = DESCRIPTION
    category: str = "Primary"

    async def run(self) -> RunResult:
        eos = self.parameters.equation_of_state
        temp = self.parameters.temperature
        pres = self.parameters.pressure

        if eos == _EquationOfState.SRK:
            system = jneqsim.thermo.system.SystemSrkEos(temp, pres)
        elif eos == _EquationOfState.PR:
            system = jneqsim.thermo.system.SystemPrEos(temp, pres)
        elif eos == _EquationOfState.SRKCPA:
            system = jneqsim.thermo.system.SystemSrkCPAstatoil(temp, pres)
        elif eos == _EquationOfState.IdealGas:
            system = jneqsim.thermo.system.SystemIdealGas(temp, pres)
        else:
            raise NotImplementedError(f"Equation of state not implemented: {eos}")

        co2_content = 1e6 - sum(self.concentrations.values())

        # Adding components to the system
        system.addComponent("CO2", co2_content, "mole/sec")
        for component, amount in self.concentrations.items():
            neqsim_name = self.formula_to_neqsim.get(component, component)
            if amount > 0.0 or component in INITIALIZED_BY_DEFAULT:
                system.addComponent(neqsim_name, amount, "mole/sec")

        if eos in (_EquationOfState.SRK, _EquationOfState.PR):
            system.setMixingRule(2)
        elif eos == _EquationOfState.SRKCPA:
            system.setMixingRule(10)

        system.setMultiPhaseCheck(True)

        # # Create an inlet stream
        inlet_stream = jneqsim.process.equipment.stream.Stream("Inlet Stream", system)
        inlet_stream.setPressure(self.parameters.pressure, "bara")
        inlet_stream.setTemperature(self.parameters.temperature, "K")
        inlet_stream.run()

        # Create a Gibbs reactor
        reactor = jneqsim.process.equipment.reactor.GibbsReactor(
            "Gibbs Reactor", inlet_stream
        )
        reactor.setUseAllDatabaseSpecies(False)
        reactor.setDampingComposition(DAMPING_COMPOSITION)
        reactor.setMaxIterations(MAX_ITERATIONS)
        reactor.setConvergenceTolerance(CONVERGENCE_TOLERANCE)
        reactor.setEnergyMode(
            jneqsim.process.equipment.reactor.GibbsReactor.EnergyMode.ISOTHERMAL
        )
        reactor.run()

        assert inlet_stream.getFluid().getNumberOfPhases() == 1, (
            "Gibbs model cannot work with two phases as of now"
        )  # Would be nice to show to the user

        # Get the outlet system
        outlet_system = reactor.getOutletStream().getThermoSystem()

        # Check mass balance convergence
        assert reactor.getMassBalanceConverged(), (
            "Mass balance should be converged"
        )  # Would be nice to show to the user

        # Collect results
        results = {}
        for i in range(outlet_system.getNumberOfComponents()):
            component = outlet_system.getComponent(i)
            mole_fraction = component.getz() * 1e6
            if component.getName() == "CO2":
                continue
            # Map neqsim name back to formula if possible
            neqsim_name = str(component.getComponentName())
            formula_name = None
            for formula, neqsim in self.formula_to_neqsim.items():
                if neqsim == neqsim_name:
                    formula_name = formula
                    break
            results[formula_name or neqsim_name] = mole_fraction

        # Return results in expected format
        # Return as tuple (final_concentrations, ReactionPathsResult) for RunResponse
        return dict(results)
