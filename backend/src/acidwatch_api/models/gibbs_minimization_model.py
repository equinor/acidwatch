from enum import StrEnum
from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
from neqsim import jneqsim

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
    valid_substances = [
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
        "water",
        "oxygen",
        "sulfuric acid",
        "nitric acid",
        "NH4NO3",
        "NH4HSO4",
        "formic acid",
        "acetic acid",
        "methanol",
        "ethanol",
        "CO",
        "NH2OH",
        "HNO2",
        "MEG",
        "DEG",
        "TEG",
        "MEA",
        "MDEA",
        "DEA",
        "ethane",
        "propane",
        "i-butane",
        "n-butane",
        "i-pentane",
        "n-pentane",
        "ethylene",
        "benzene",
        "toluene",
        "o-Xylene",
        "HCN",
        "CS2",
        "argon",
        "CH2O",
        "C2H4O",
        "C2H4",
    ]
    # Map formulas to neqsim names
    formula_to_neqsim = {
        "H2O": "water",
        "SO2": "SO2",
        "SO3": "SO3",
        "NO2": "NO2",
        "NO": "NO",
        "H2S": "H2S",
        "O2": "oxygen",
        "H2SO4": "sulfuric acid",
        "HNO3": "nitric acid",
        "S8": "S8",
        "CH4": "methane",
        "water": "water",
        "oxygen": "oxygen",
        "sulfuric acid": "sulfuric acid",
        "nitric acid": "nitric acid",
        "NH4NO3": "NH4NO3",
        "NH4HSO4": "NH4HSO4",
        "formic acid": "formic acid",
        "acetic acid": "acetic acid",
        "methanol": "methanol",
        "ethanol": "ethanol",
        "CO": "CO",
        "NH2OH": "NH2OH",
        "HNO2": "HNO2",
        "MEG": "MEG",
        "DEG": "DEG",
        "TEG": "TEG",
        "MEA": "MEA",
        "MDEA": "MDEA",
        "DEA": "DEA",
        "ethane": "ethane",
        "propane": "propane",
        "i-butane": "i-butane",
        "n-butane": "n-butane",
        "i-pentane": "i-pentane",
        "n-pentane": "n-pentane",
        "ethylene": "ethylene",
        "benzene": "benzene",
        "toluene": "toluene",
        "o-Xylene": "o-Xylene",
        "HCN": "HCN",
        "CS2": "CS2",
        "argon": "argon",
        "CH2O": "CH2O",
        "C2H4O": "C2H4O",
        "C2H4": "C2H4"
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
        system.addComponent("CO2", float(co2_content), "mole/sec")
        for component, amount in self.concentrations.items():
            neqsim_name = self.formula_to_neqsim.get(component, component)
            if amount > 0.0:
                system.addComponent(neqsim_name, float(amount), "mole/sec")
        NOT_BY_DEFAULT = [
            "hydrogen", "N2O3", "N2O", "nitrogen", "N2H4", "COS", "methane", "ammonia"
        ]
        for component in self.valid_substances:
            if component in NOT_BY_DEFAULT:
                continue
            neqsim_name = self.formula_to_neqsim.get(component, component)
            system.addComponent(neqsim_name, 0.0, "mole/sec")

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
        reactor.setDampingComposition(0.05)
        reactor.setMaxIterations(5000)
        reactor.setConvergenceTolerance(1e-3)
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
