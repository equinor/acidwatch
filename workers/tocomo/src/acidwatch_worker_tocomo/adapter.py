import asyncio

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, TableResult
from acidwatch_models.definitions.tocomo import TocomoAdapter as TocomoDefinition
from tocomo.reactions import MOLECULE_TEXT, REACTIONS, Molecule, run_model_sm1


class TocomoAdapter(TocomoDefinition):
    async def run(self) -> RunResult:
        return await asyncio.to_thread(self._run)

    def _run(self) -> RunResult:
        result = run_model_sm1(
            {
                Molecule[substance]: concentration
                for substance, concentration in self.concentrations.items()
            }
        )
        reactions = {reaction.index: str(reaction) for reaction in REACTIONS}
        steps = [
            {
                "Index": str(step.reaction_index),
                "Reaction": reactions[step.reaction_index],
                "Multiplier": step.multiplier,
                **{
                    MOLECULE_TEXT[molecule]: concentration
                    for molecule, concentration in step.posterior.items()
                },
            }
            for step in result.steps
        ]

        return (
            [
                Phase(
                    kind="co2-rich",
                    fraction=1.0,
                    concentrations={
                        molecule.name: result.final.get(molecule, 0.0)
                        for molecule in Molecule
                    },
                )
            ],
            TableResult(data=steps, label="Reaction Steps"),
        )
