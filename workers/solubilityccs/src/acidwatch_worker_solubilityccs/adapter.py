from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, TextResult
from acidwatch_models.definitions.solubilityccs import (
    SolubilityCCSAdapter as SolubilityCCSDefinition,
)
from solubilityccs import Fluid, ModelResults  # type: ignore
from solubilityccs.neqsim_functions import get_co2_parameters  # type: ignore


class SolubilityCCSAdapter(SolubilityCCSDefinition):
    async def run(self) -> RunResult:
        h2o = self.concentrations.get("H2O", 0.0)
        h2so4 = self.concentrations.get("H2SO4", 0.0)
        hno3 = self.concentrations.get("HNO3", 0.0)
        temperature = self.conditions.temperature + 273
        pressure = self.conditions.pressure
        flow_rate = self.parameters.flow_rate

        co2 = 1e6 - (h2o + h2so4 + hno3)
        fluid = Fluid()
        fluid.add_component("CO2", co2)

        if h2o > 0:
            fluid.add_component("H2O", h2o)
        if h2so4 > 0:
            fluid.add_component("H2SO4", h2so4)
        elif hno3 > 0:
            fluid.add_component("HNO3", hno3)
        fluid.set_temperature(temperature)
        fluid.set_pressure(pressure)
        fluid.set_flow_rate(flow_rate * 1e6 * 1000 / (365 * 24), "kg/hr")
        fluid.calc_vapour_pressure()
        fluid.flash_activity()

        co2_properties = get_co2_parameters(pressure, temperature)
        results = ModelResults(fluid, co2_properties=co2_properties)
        table = results.generate_table()
        phases = self._extract_phases(fluid)

        if h2so4 > 0 and hno3 > 0:
            for phase in phases:
                if phase.kind == "co2-rich":
                    phase.concentrations.setdefault("HNO3", hno3)

        return phases, TextResult(data=table, label="Solubility Output")

    def _extract_phases(self, fluid: Fluid) -> list[Phase]:
        co2_rich_phase = fluid.phases[0]
        co2_rich_fraction = fluid.betta
        co2_rich_concentrations = {
            component: fraction * 1e6
            for component, fraction in zip(
                co2_rich_phase.components, co2_rich_phase.fractions
            )
            if component != "CO2"
        }
        phases = [
            Phase(
                kind="co2-rich",
                fraction=co2_rich_fraction,
                concentrations=co2_rich_concentrations,
            )
        ]

        if co2_rich_fraction < 1.0 and len(fluid.phases) > 1:
            liquid_phase = fluid.phases[1]
            aqueous_concentrations = {
                component: fraction * 1e6
                for component, fraction in zip(
                    liquid_phase.components, liquid_phase.fractions
                )
                if component != "CO2"
            }
            phases.append(
                Phase(
                    kind="aqueous",
                    fraction=1.0 - co2_rich_fraction,
                    concentrations=aqueous_concentrations,
                )
            )

        return phases
