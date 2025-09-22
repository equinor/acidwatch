from __future__ import annotations
from acidwatch_api.models.arcs import DESCRIPTION
from reaktoro import *
from acidwatch_api.models.base import (
    BaseAdapter,
    BaseParameters,
    Parameter,
    Unit,
    RunResult,
)
from acidwatch_api.models.datamodel import TextResult


class ReaktoroParameters(BaseParameters):
    temperature: int = Parameter(
        300,
        label="Temperature",
        unit=Unit.TEMPERATURE_KELVIN,
        min=200,
        max=400,
        description="Temperature in Celsius",
    )

    pressure: int = Parameter(
        10,
        label="Pressure",
        unit="bara",
        min=1,
        max=300,
        description="Pressure in bara",
    )


DESCRIPTION = """Reaktoro"""


class ReaktoroAdapter(BaseAdapter):
    model_id = "reaktoro"

    display_name = "Reaktoro"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
        "NO",
        "H2SO4",
        "HNO3",
    ]

    parameters: ReaktoroParameters

    description = DESCRIPTION

    category: str = "Primary"

    async def run(self) -> RunResult:
        db = NasaDatabase("nasa-cea")
        elements = " ".join(list(self.concentrations.keys()))
        gases = GaseousPhase(elements)
        system = ChemicalSystem(db, gases)
        state = ChemicalState(system)
        state.temperature(self.parameters.temperature, "kelvin")
        state.pressure(self.parameters.pressure, "bar")

        for compound, amount in self.concentrations.items():
            state.set(compound, amount, "mol")

        solver = EquilibriumSolver(system)
        solver.solve(state)

        return {
            name: state.speciesAmount(name) for name in self.concentrations.keys()
        }, TextResult(data=str(state), label="Reaktoro")
