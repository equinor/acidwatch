import asyncio

from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase, ReactionPathsResult
from acidwatch_models.definitions.arcs import ArcsAdapter as ArcsDefinition
from arcs.analysis import AnalyseSampling
from arcs.traversal import traverse


def _run_simulation(
    concentrations: dict[str, int | float],
    temperature: int | float,
    pressure: int | float,
    *,
    samples: int = 2000,
    nproc: int = 4,
):
    results = traverse(
        int(temperature),
        int(pressure),
        {
            substance: concentration / 1e6
            for substance, concentration in concentrations.items()
        },
        samples=samples,
        nproc=nproc,
    )

    analysis = AnalyseSampling(results.data)
    analysis.reaction_statistics()
    analysis.mean_sampling()
    analysis.reaction_paths()

    return results.final_concs, analysis.common_paths, analysis.stats


class ArcsAdapter(ArcsDefinition):
    async def run(self) -> RunResult:
        final_concentrations, paths, stats = await asyncio.to_thread(
            _run_simulation,
            self.concentrations,
            self.conditions.temperature + 273,
            self.conditions.pressure,
        )
        common_paths = [
            {
                "Path": value.replace("<sub>", "").replace("</sub>", ""),
                "k": paths["k"][key],
                "Frequency": paths["frequency"][key],
            }
            for key, value in paths["paths"].items()
        ]
        all_stats = [
            {
                "Path": value,
                "k": stats["k"][key],
                "Frequency": stats["frequency"][key],
            }
            for key, value in stats["index"].items()
        ]
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value * 1e6 for key, value in final_concentrations.items()
                },
            )
        ], ReactionPathsResult(common_paths=common_paths, stats=all_stats)
