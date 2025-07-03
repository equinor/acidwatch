from __future__ import annotations

from io import StringIO
from acidwatch_api.models.base import BaseAdapter, BaseParameters, Parameter
from solubilityccs import Fluid


class SolubilityParameters(BaseParameters):
    temperature: int = Parameter(60, custom_unit="°C", label="Temperature")
    pressure: int = Parameter(60, custom_unit="bara", label="Pressure")
    flow_rate: int = Parameter(100, custom_unit="Mt/year", label="Flow rate")
    # acid: str = Parameter("H2SO4", choices=["H2SO4", "HNO3"], label="Acid")


class SolubilityAdapter(BaseAdapter):
    model_id = "solubilityccs"
    display_name = "Solubility CCS"

    valid_substances = ["H2O", "H2SO4", "HNO3"]
    parameters: SolubilityParameters

    async def run(self):
        fluid = Fluid()
        h2o = self.concentrations["H2O"]
        acid = "H2SO4"
        fluid.add_component("H2O", h2o * 1e-6)
        fluid.add_component("H2SO4",  self.concentrations["H2SO4"] * 1e-6)
        fluid.add_component("CO2", 1.0 - h2o * 1e-6 - self.concentrations["H2SO4"] * 1e-6)
        fluid.set_temperature(self.parameters.temperature + 273.15)
        fluid.set_pressure(self.parameters.pressure)
        fluid.set_flow_rate(self.parameters.flow_rate * 1e6 * 1000 / (365 * 24), "kg/hr")
        fluid.calc_vapour_pressure()
        fluid.flash_activity()

        stream = StringIO()

        return TextResult()

        print(
            "Mole fraction of gas phase to total phase", fluid.betta, "mol/mol", file=stream
        )  # If this value is lower than 1 - danger of acid formation due to 2 phase
        print(
            "water in CO2 ", 1e6 * fluid.phases[0].get_component_fraction("H2O"), " ppm mol", file=stream
        )  # ppm
        print(
            acid, "in CO2 ", 1e6 * fluid.phases[0].get_component_fraction(acid), " ppm mol", file=stream
        )  # ppm

        if fluid.betta < 1:
            print("Second phase is ", fluid.phases[1].name, file=stream)
            print("Liquid phase formed", fluid.phases[1].get_acid_wt_prc(acid), " wt %", file=stream)
            print(
                "Liquid phase formed",
                fluid.phases[1].get_flow_rate("kg/hr") * 24 * 365 / 1000,
                "t/y", file=stream
            )  # Flow rate needed for this calculation
            print(
                "Water in liquid phase ",
                fluid.phases[1].get_component_fraction("H2O"),
                "mol fraction", file=stream
            )  # ppm
            print(
                acid,
                " in liquid phase ",
                fluid.phases[1].get_component_fraction(acid),
                "mol fraction", file=stream
            )  # ppm

            print("Acid formation risk is high!", file=stream)

        return stream.getvalue()
