from acidwatch_messaging.datamodel import Phase
from acidwatch_worker_runtime import RunResult

from .definition import ExampleAdapter as ExampleDefinition


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
