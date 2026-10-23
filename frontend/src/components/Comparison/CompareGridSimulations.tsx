import { useMemo, useState } from "react";
import { useQueries, type Query } from "@tanstack/react-query";
import { NativeSelect, Typography } from "@equinor/eds-core-react";
import { getGridSimulationResult } from "@/api/api";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { Phase } from "@/dto/SimulationResults";
import LineChart, { LineSeries } from "@/components/Charts/LineChart";
import {
    collectOutputSubstances,
    pointOutput,
    significantSubstances,
    visiblePhaseKinds,
} from "@/components/GridSimulation/gridSimulationUtils";
import { optionName } from "@/functions/Substance";
import { useAvailableModels } from "@/contexts/ModelContext";
import { modelChainLabel, phaseUnit } from "@/utils/modelUtils";
import ModelAccordionLayout from "@/components/ModelAccordionLayout";
import { buildPhaseAccordionItems } from "@/utils/accordionItems";
import ConcentrationTable, { SimulationConcentrations } from "@/components/Tables/ConcentrationTable";
import ComparisonPage from "@/components/Comparison/ComparisonPage";

interface CompareGridSimulationsProps {
    gridIds: string[];
}

const gridModelLabel = (result: GridSimulationResult): string =>
    modelChainLabel(result.simulations[0]?.input.models ?? []);

interface CompareSectionProps {
    results: GridSimulationResult[];
    modelIndex: number;
    phaseKind: Phase["kind"];
}

const CompareSection: React.FC<CompareSectionProps> = ({ results, modelIndex, phaseKind }) => {
    const allSubstances = useMemo(() => {
        const substances = new Set<string>();
        results.forEach((r) =>
            significantSubstances(r.simulations, modelIndex, phaseKind).forEach((s) => substances.add(s))
        );
        if (substances.size === 0) {
            results.forEach((r) =>
                collectOutputSubstances(r.simulations, modelIndex, phaseKind).forEach((s) => substances.add(s))
            );
        }
        return Array.from(substances).sort();
    }, [results, modelIndex, phaseKind]);

    const [substance, setSubstance] = useState<string>("");
    const selectedSubstance = substance || allSubstances[0] || "";

    const referenceResult = results.at(0);
    const xAxisSubstance = referenceResult?.axes[0]?.substance ?? "";
    const unifiedXValues = Array.from(
        new Set(results.flatMap((r) => r.simulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0)))
    ).sort((a, b) => a - b);

    const series: LineSeries[] = results.map((r) => {
        const valueToSim = new Map(r.simulations.map((sim) => [sim.input.concentrations[xAxisSubstance] ?? 0, sim]));
        return {
            label: `${gridModelLabel(r)} · ${r.axes[0]?.substance ?? ""}`,
            data: unifiedXValues.map((x) => {
                const sim = valueToSim.get(x);
                return sim ? pointOutput(sim, selectedSubstance, modelIndex, phaseKind) : null;
            }),
        };
    });

    const axisSubstances = new Set(results.map((r) => r.axes[0]?.substance).filter(Boolean));
    const xAxisLabel =
        axisSubstances.size === 1 ? `${[...axisSubstances][0]} (ppm·mol)` : "Varied concentration (ppm·mol)";
    const unit = phaseUnit(phaseKind);

    return (
        <>
            <NativeSelect
                id={`compare-${modelIndex}-${phaseKind}`}
                label="Output compound"
                value={selectedSubstance}
                onChange={(e) => setSubstance(e.target.value)}
                style={{ maxWidth: "400px", marginBottom: "1rem" }}
            >
                {allSubstances.map((s) => (
                    <option key={s} value={s}>
                        {optionName(s)}
                    </option>
                ))}
            </NativeSelect>
            {selectedSubstance === "" ? (
                <Typography variant="body_short" italic>
                    No output substances available to compare.
                </Typography>
            ) : (
                <LineChart
                    xValues={unifiedXValues}
                    series={series}
                    xAxisLabel={xAxisLabel}
                    yAxisLabel={`${selectedSubstance} (${unit})`}
                    aspectRatio={2}
                />
            )}
        </>
    );
};

const CompareGridSimulations: React.FC<CompareGridSimulationsProps> = ({ gridIds }) => {
    const { models } = useAvailableModels();

    const queries = useQueries({
        queries: gridIds.map((id) => ({
            queryKey: ["grid-simulation", id],
            queryFn: () => getGridSimulationResult(id),
            refetchInterval: (query: Query<GridSimulationResult>) =>
                query.state.data?.status === "pending" || query.state.data?.status === "processing" ? 2000 : false,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);
    const results = queries.map((q) => q.data).filter((data): data is GridSimulationResult => data !== undefined);
    const referenceResult = results.at(0);

    const inputModels = referenceResult?.simulations[0]?.input.models ?? [];
    const allSimulations = results.flatMap((r) => r.simulations);
    const items = buildPhaseAccordionItems(
        inputModels,
        models,
        (modelIndex) => visiblePhaseKinds(allSimulations, modelIndex),
        (modelIndex, phaseKind) => <CompareSection results={results} modelIndex={modelIndex} phaseKind={phaseKind} />
    );

    const gridInputs: SimulationConcentrations[] = results.map((result, index) => {
        const ranges = Object.fromEntries(result.axes.map((axis) => [axis.substance, axis.range]));
        return {
            id: gridIds[index],
            modelName: gridModelLabel(result),
            concentrations: result.simulations[0]?.input.concentrations ?? {},
            ranges,
        };
    });

    const inputSubstances = Array.from(
        new Set(gridInputs.flatMap((grid) => [...Object.keys(grid.concentrations), ...Object.keys(grid.ranges ?? {})]))
    ).sort();

    return (
        <ComparisonPage
            title="Compare Grid Simulations"
            isEmpty={gridIds.length === 0}
            emptyMessage="No grid simulations selected for comparison."
            isLoading={isLoading}
            hasError={hasError}
            errorMessage="Error loading grid simulation results"
        >
            <Typography variant="h4" style={{ margin: "1rem 0" }}>
                Input Concentrations
            </Typography>

            <div style={{ marginBottom: "2rem" }}>
                <ConcentrationTable substances={inputSubstances} simulations={gridInputs} highlightDifferences />
            </div>

            <ModelAccordionLayout items={items} />
        </ComparisonPage>
    );
};

export default CompareGridSimulations;
