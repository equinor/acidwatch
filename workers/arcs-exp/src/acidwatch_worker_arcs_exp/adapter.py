import asyncio
import importlib.resources

import pandas as pd
from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.arcs_exp import (
    ArcsExpAdapter as ArcsExpDefinition,
)
from arcs.analysis import AnalyseSampling
from arcs.generate import GenerateInitialConcentrations, GraphGenerator
from arcs.traversal import Traversal


DFT_FILENAME = importlib.resources.files("arcs").joinpath(
    "data", "quantum_data.json.gz"
)


def _run_simulation(
    concentrations: dict[str, int | float],
    temperature: int | float,
    pressure: int | float,
    *,
    samples: int = 500,
    ncpus: int = 4,
) -> dict[str, float]:
    graph = GraphGenerator().from_file(
        filename=str(DFT_FILENAME),
        temperature=temperature,
        pressure=pressure,
        max_reaction_length=4,
    )
    initial_concentrations = GenerateInitialConcentrations(graph=graph).update_ic(
        {
            substance: concentration / 1e6
            for substance, concentration in concentrations.items()
        }
    )
    simulation_data = Traversal(graph=graph).sample(
        initial_concentrations=initial_concentrations,
        ncpus=ncpus,
        nsamples=samples,
    )
    average_data = pd.DataFrame(AnalyseSampling().average_sampling(simulation_data))
    average_data = average_data.loc[~(average_data == 0).all(axis=1)]
    average_data.sort_values(by="diff", inplace=True)
    return {
        str(substance): float(concentration)
        for substance, concentration in average_data["mean"].to_dict().items()
    }


class ArcsExpAdapter(ArcsExpDefinition):
    async def run(self) -> RunResult:
        result = await asyncio.to_thread(
            _run_simulation,
            self.concentrations,
            self.conditions.temperature + 273,
            self.conditions.pressure,
        )

        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    substance: concentration * 1e6
                    for substance, concentration in result.items()
                },
            )
        ]
