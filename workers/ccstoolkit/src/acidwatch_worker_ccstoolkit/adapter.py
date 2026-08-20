from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.ccstoolkit import (
    CCStoolkitAdapter as CCStoolkitDefinition,
)
from ccstoolkit import eqstreamcomp


class CCStoolkitAdapter(CCStoolkitDefinition):
    async def run(self) -> RunResult:
        temperature = self.conditions.temperature + 273
        p0 = {key.upper(): value for key, value in self.concentrations.items()}
        p0['tot'] = 18.55e3
        p0['T'] = temperature
        comp_p0 = eqstreamcomp.get_composition(
            p0, options={'maxiter': 10000, 'maxfev': 10000}
        )
        return [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value / 18.55e3 * 1e6
                    for key, value in comp_p0.items()
                    if key != 'T' and key != 'tot'
                },
            ),
        ]
