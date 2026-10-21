from acidwatch_models import RunResult
from acidwatch_models.datamodel import (
    GroupPanel,
    Phase,
    StabilityDiagramResult,
    StabilityRegion,
)
from acidwatch_models.definitions.ccstoolkit import (
    CCStoolkitAdapter as CCStoolkitDefinition,
)
from ccstoolkit import corrosion_maps, eqstreamcomp


class CCStoolkitAdapter(CCStoolkitDefinition):
    async def run(self) -> RunResult:
        temperature = self.conditions.temperature + 273
        p0 = {key.upper(): value for key, value in self.concentrations.items()}
        p0["tot"] = 18.55e3
        p0["T"] = temperature
        comp_p0 = eqstreamcomp.get_composition(
            p0, options={"maxiter": 10000, "maxfev": 10000}
        )
        phases = [
            Phase(
                kind="co2-rich",
                fraction=1.0,
                concentrations={
                    key: value / 18.55e3 * 1e6
                    for key, value in comp_p0.items()
                    if key != "T" and key != "tot"
                },
            ),
        ]

        sulphur = (p0.get("H2S", 0) + p0.get("SO2", 0)) * p0["tot"] / 1e6
        nitrogen = (p0.get("NO2", 0) * p0["tot"]) / 1e6

        maps = corrosion_maps.get_stability_maps(
            {
                "N": nitrogen,
                "S": sulphur,
                "T": temperature,
            }
        )
        # ccstoolkit requires some minimum values of nitrogen and sulfur to create the maps
        # otherwise the returned type is None
        if maps is None:
            return phases

        return (
            phases,
            GroupPanel(
                label="Corrosion maps",
                panels=[
                    StabilityDiagramResult(
                        label=f"{key} map",
                        x_label="lg H2O",
                        y_label="lg O2",
                        regions=[
                            StabilityRegion(
                                name=region["name"],
                                points=[
                                    (float(x), float(y)) for x, y in region["points"]
                                ],
                                centroid=tuple(float(v) for v in region["centroid"]),
                            )
                            for region in regions
                        ],
                    )
                    for key, regions in maps.items()
                ],
            ),
        )
