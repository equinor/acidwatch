from __future__ import annotations
from acidwatch_api.models.base import BaseAdapter, BaseParameters, Parameter, RunResult
from acidwatch_api.models.datamodel import Phase
from ccstoolkit import eqstreamcomp

DESCRIPTION = """
Computational model from Queen Mary University of London for calculating equilibrium composition of dense CO2 streams.

Based on the paper R. I. Slavchov, M. H. Iqbal, S. Faraji, D. Madden, J. Sonke, S. M. Clarke (2024). Corrosion maps: Stability and composition diagrams for corrosion problems in CO2 transport. *Corrosion Science, 236*, 112204.

The source code can be found at https://github.com/bipeychev/ccstoolkit.
"""


class CCStoolkitAdapter(BaseAdapter):
    model_id = "ccstoolkit"
    display_name = "ccstoolkit"
    description = DESCRIPTION
    category = "Reactive"

    valid_substances = [
        "O2",
        "H2O",
        "H2S",
        "SO2",
        "NO2",
    ]

    authentication = False

    async def run(self) -> RunResult:
        temperature = self.conditions.temperature + 273
        p0 = {key.upper(): value for key, value in self.concentrations.items()}
        p0['tot'] = 18.55e3
        p0['T'] = temperature
        print("================================")
        print("p0 = ", p0)
        print("================================")
        comp_p0 = eqstreamcomp.get_composition(p0, options={'maxiter': 10000, 'maxfev': 10000})
        print("================================")
        print("comp_p0 = ", comp_p0)
        print("================================")
        return [
            Phase(kind="co2-rich", fraction=1.0, concentrations={key: value for key, value in comp_p0.items() if key != 'T' and key != 'tot'}),
        ]
