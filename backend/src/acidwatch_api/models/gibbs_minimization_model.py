from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
from neqsim import jneqsim

DESCRIPTION: str = """The model's primary advantage lies in its ability to analyze complex systems, such as CO2 with impurities, without the need to specify individual reactions. By focusing only on the thermodynamic principles that govern the system's behavior, it identifies the stable state corresponding to the minimum total Gibbs free energy at given temperature and pressure.

However, the model also has limitations. It requires the input of all possible species that could form from the elements present; missing any potential species may lead to incorrect equilibrium calculations (that is does not necessary mean poor description of real case scenario). Additionally, the model does not account for kinetics or activation energy, which are crucial for understanding the speed of reactions and the energy barriers that must be overcome for reactions to occur. As a result, while the model can predict the equilibrium state, it cannot guarantee that the real CO2 with impurities system actually reach that state.

The model uses neqsim library for the fluid description (EOS)."""


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
    EOS: int = Parameter(
        0,
        label="Equation of State",
        description="Choose EOS: 0: SRK; 1: PR; or 2: SRKCPA",
        unit="0: SRK; 1: PR; or 2: SRKCPA",
        min=0,
        max=2,
    )


class GibbsMinimizationModelAdapter(BaseAdapter):
    valid_substances = [
        "H2O",
        "SO2",
        "SO3",
        "NO2",
        "NO",
        "NH3",
        "H2S",
        "O2",
        "H2SO4",
        "HNO3",
        "S8",
        "CH4",
        "H2",
        "N2",
    ]

    # Map formulas to neqsim names
    formula_to_neqsim = {
        "H2O": "water",
        "SO2": "SO2",
        "SO3": "SO3",
        "NO2": "NO2",
        "NO": "NO",
        "NH3": "ammonia",
        "H2S": "H2S",
        "O2": "oxygen",
        "H2SO4": "sulfuric acid",
        "HNO3": "nitric acid",
        "S8": "S8",
        "CH4": "methane",
        "H2": "hydrogen",
        "N2": "nitrogen",
    }

    model_id = "gibbs_minimization"
    display_name = "Gibbs Minimization Model"
    parameters: GibbsMinimizationModelParameters
    description = DESCRIPTION

    async def run(self) -> RunResult:
        # Select EOS type and create system
        eos = self.parameters.EOS
        temp = self.parameters.temperature
        pres = self.parameters.pressure

        if eos == 0:
            system = jneqsim.thermo.system.SystemSrkEos(temp, pres)
        elif eos == 1:
            system = jneqsim.thermo.system.SystemPrEos(temp, pres)
        elif eos == 2:
            system = jneqsim.thermo.system.SystemSrkCPAstatoil(temp, pres)
        else:
            system = jneqsim.thermo.system.SystemSrkEos(temp, pres)

        co2_content = 1e6 - sum(self.concentrations.values())
        # Adding components to the system
        system.addComponent("CO2", co2_content, "mole/sec")
        for component, amount in self.concentrations.items():
            neqsim_name = self.formula_to_neqsim.get(component, component)
            if amount > 0.0:
                system.addComponent(neqsim_name, amount, "mole/sec")

        system.addComponent("SO2", 0.0, "mole/sec")
        system.addComponent("SO3", 0.0, "mole/sec")
        system.addComponent("NO2", 0.0, "mole/sec")
        system.addComponent("NO", 0.0, "mole/sec")
        system.addComponent("water", 0.0, "mole/sec")
        system.addComponent("ammonia", 0.0, "mole/sec")
        system.addComponent("H2S", 0.0, "mole/sec")
        system.addComponent("oxygen", 0.0, "mole/sec")
        system.addComponent("sulfuric acid", 0.0, "mole/sec")
        system.addComponent("nitric acid", 0.0, "mole/sec")
        system.addComponent("S8", 0.0, "mole/sec")

        system.setMixingRule(2)
        system.setMultiPhaseCheck(True)

        if self.parameters.EOS == 0 or self.parameters.EOS == 1:
            system.setMixingRule(2)
        elif self.parameters.EOS == 2:
            system.setMixingRule(10)
        else:
            system.setMixingRule(2)

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
        reactor.setDampingComposition(0.1)
        reactor.setMaxIterations(20000)
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
