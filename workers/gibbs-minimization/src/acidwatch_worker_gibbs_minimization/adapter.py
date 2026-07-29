import asyncio

from neqsim import jneqsim
from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.gibbs_minimization import (
    INITIALIZED_BY_DEFAULT,
    EquationOfState,
    GibbsMinimizationModelAdapter as GibbsMinimizationDefinition,
)

# Model constants
# Damping factor for composition convergence in Gibbs reactor
DAMPING_COMPOSITION = 0.05  # Used for reactor.setDampingComposition()
MAX_ITERATIONS = 5000  # Used for reactor.setMaxIterations()
CONVERGENCE_TOLERANCE = 1e-2  # Used for reactor.setConvergenceTolerance()
# Timeout for the (blocking) reactor.run() call.
REACTOR_TIMEOUT_SECONDS = 60


class GibbsMinimizationModelAdapter(GibbsMinimizationDefinition):
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

    async def run(self) -> RunResult:
        eos = self.parameters.equation_of_state
        # Conditions.temperature is in Celsius; neqsim expects Kelvin.
        temperature = self.conditions.temperature + 273
        pressure = self.conditions.pressure

        if eos == EquationOfState.SRK:
            system = jneqsim.thermo.system.SystemSrkEos(temperature, pressure)
        elif eos == EquationOfState.PR:
            system = jneqsim.thermo.system.SystemPrEos(temperature, pressure)
        elif eos == EquationOfState.SRKCPA:
            system = jneqsim.thermo.system.SystemSrkCPAstatoil(temperature, pressure)
        elif eos == EquationOfState.IdealGas:
            system = jneqsim.thermo.system.SystemIdealGas(temperature, pressure)
        else:
            raise NotImplementedError(f"Equation of state not implemented: {eos}")

        co2_content = 1e6 - sum(self.concentrations.values())

        # Adding components to the system
        system.addComponent("CO2", co2_content, "mole/sec")
        for component, amount in self.concentrations.items():
            neqsim_name = self.formula_to_neqsim.get(component, component)
            if amount > 0.0 or component in INITIALIZED_BY_DEFAULT:
                system.addComponent(neqsim_name, amount, "mole/sec")

        if eos in (EquationOfState.SRK, EquationOfState.PR):
            system.setMixingRule(2)
        elif eos == EquationOfState.SRKCPA:
            system.setMixingRule(10)

        system.setMultiPhaseCheck(True)

        # # Create an inlet stream
        inlet_stream = jneqsim.process.equipment.stream.Stream("Inlet Stream", system)
        inlet_stream.setPressure(pressure, "bara")
        inlet_stream.setTemperature(temperature, "K")
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

        try:
            await asyncio.wait_for(
                asyncio.to_thread(reactor.run),
                timeout=REACTOR_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            raise RuntimeError(
                f"Gibbs reactor did not converge within "
                f"{REACTOR_TIMEOUT_SECONDS}s using the '{eos.value}' "
                f"equation of state."
            )

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
        return [Phase(kind="co2-rich", fraction=1.0, concentrations=dict(results))]
