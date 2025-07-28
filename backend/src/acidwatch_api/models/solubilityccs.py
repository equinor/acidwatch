from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    RunResult,
    Unit,
)
from acidwatch_api.models.datamodel import TextResult

from solubilityccs import Fluid, ModelResults  # type: ignore
from solubilityccs.neqsim_functions import get_co2_parameters  # type: ignore


class SolubilityCCSParameters(BaseParameters):
    temperature: float = Parameter(
        250,
        label="Temperature",
        unit=Unit.CELCIUS,
        min=0,
        max=400,
    )
    pressure: float = Parameter(
        1,
        label="Pressure",
        unit=Unit.BAR_A,
        min=1.0,
        max=300,
    )
    flow_rate: float = Parameter(
        100,
        label="Flow rate",
        min=0.01,
        max=10000,
        custom_unit="Mt/year",
    )


class SolubilityCCSAdapter(BaseAdapter):
    model_id = "solubilityccs"
    display_name = "Solubility CCS"

    valid_substances = ["H2O", "H2SO4", "HNO3"]
    parameters: SolubilityCCSParameters

    async def run(self) -> RunResult:
        # Get concentrations (mole fractions)
        co2 = self.concentrations.get("CO2", 0.0)
        h2o = self.concentrations.get("H2O", 0.0)
        h2so4 = self.concentrations.get("H2SO4", 0.0)
        hno3 = self.concentrations.get("HNO3", 0.0)
        temp = self.parameters.temperature
        pres = self.parameters.pressure
        flow_rate = self.parameters.flow_rate

        co2 = 1 - (h2o + h2so4 + hno3)
        fluid = Fluid()
        fluid.add_component("CO2", co2)
        if h2so4 > 0:
            fluid.add_component("H2SO4", h2so4)
        if h2o > 0:
            fluid.add_component("H2O", h2o)
        if hno3 > 0:
            fluid.add_component("HNO3", hno3)
        fluid.set_temperature(temp + 273.15)
        fluid.set_pressure(pres)
        fluid.set_flow_rate(flow_rate * 1e6 * 1000 / (365 * 24), "kg/hr")
        fluid.calc_vapour_pressure()
        fluid.flash_activity()

        co2_properties = get_co2_parameters(pres, temp + 273.15)
        results_obj = ModelResults(fluid, co2_properties=co2_properties)
        table = results_obj.generate_table()

        return {}, TextResult(data=table, label="Solubility Output")
