from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.example import (
    ExampleAdapter as ExampleDefinition,
)


class ExampleAdapter(ExampleDefinition):
    async def run(self) -> RunResult:
        retained = 1 - self.parameters.spontaneously_combust / 100
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    substance: concentration * retained
                    for substance, concentration in self.concentrations.items()
                },
            )
        ]
