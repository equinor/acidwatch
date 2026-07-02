import React, { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CircularProgress, NativeSelect, Typography } from "@equinor/eds-core-react";
import { getGridSimulationResult, ResultIsPending } from "@/api/api";
import { MainContainer } from "@/components/styles";
import { GridSimulationResult } from "@/dto/GridSimulation";
import LineChart, { LineSeries } from "@/components/LineChart";
import {
    collectOutputSubstances,
    pointOutput,
    significantSubstances,
    visiblePhaseKinds,
} from "@/functions/GridSimulation";
import { optionName } from "@/functions/Substance";
import { useAvailableModels } from "@/contexts/ModelContext";
import { buildModelSections, phaseLabel } from "@/utils/modelUtils";
import ModelAccordionLayout, { AccordionItem } from "@/components/ModelAccordionLayout";
import ConcentrationTable, { SimulationConcentrations } from "@/components/ConcentrationTable";

interface CompareGridSimulationsProps {
    gridIds: string[];
}

const modelChainLabel = (result: GridSimulationResult): string => {
    const firstSim = result.simulations[0];
    if (!firstSim) return "Unknown model";
    return firstSim.input.models.map((m) => m.modelId).join(" → ") || "Unknown model";
};

interface CompareSectionProps {
    results: GridSimulationResult[];
    modelIndex: number;
    phaseKind: string;
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

    const xAxisSubstance = results[0]?.axes[0]?.substance ?? "";
    const unifiedXValues = Array.from(
        new Set(results.flatMap((r) => r.simulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0)))
    ).sort((a, b) => a - b);

    const series: LineSeries[] = results.map((r) => {
        const valueToSim = new Map(r.simulations.map((sim) => [sim.input.concentrations[xAxisSubstance] ?? 0, sim]));
        return {
            label: `${modelChainLabel(r)} · ${r.axes[0]?.substance ?? ""}`,
            data: unifiedXValues.map((x) => {
                const sim = valueToSim.get(x);
                return sim ? pointOutput(sim, selectedSubstance, modelIndex, phaseKind) : null;
            }),
        };
    });

    const axisSubstances = new Set(results.map((r) => r.axes[0]?.substance).filter(Boolean));
    const xAxisLabel =
        axisSubstances.size === 1 ? `${[...axisSubstances][0]} (ppm·mol)` : "Varied concentration (ppm·mol)";
    const unit = phaseKind === "aqueous" ? "wt%" : "ppm·mol";

    return (
        <>
            <NativeSelect
                id={`compare-${modelIndex}-${phaseKind}`}
                label="Output substance"
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
            retry: (_count: number, error: Error) => error instanceof ResultIsPending,
            retryDelay: () => 2000,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const hasError = queries.some((q) => q.isError);
    const results = queries.map((q) => q.data).filter((data): data is GridSimulationResult => data !== undefined);

    const header = (
        <Typography variant="h2" style={{ marginBottom: "2rem" }}>
            Compare Grid Simulations
        </Typography>
    );

    if (gridIds.length === 0) {
        return (
            <MainContainer>
                {header}
                <Typography variant="body_short">No grid simulations selected for comparison.</Typography>
            </MainContainer>
        );
    }
    if (isLoading) {
        return (
            <MainContainer>
                {header}
                <CircularProgress />
            </MainContainer>
        );
    }
    if (hasError) {
        return (
            <MainContainer>
                {header}
                <Typography variant="body_short" style={{ color: "red" }}>
                    Error loading grid simulation results
                </Typography>
            </MainContainer>
        );
    }

    const firstSim = results[0]?.simulations[0];
    const inputModels = firstSim?.input.models ?? [];
    const sections = buildModelSections(inputModels, models);

    const allPhasesByModel = new Map<number, string[]>();
    sections.forEach((section) => {
        section.indices.forEach((modelIndex) => {
            const phases = new Set<string>();
            results.forEach((r) => {
                visiblePhaseKinds(r.simulations, modelIndex).forEach((k) => phases.add(k));
            });
            const order = ["co2-rich", "aqueous"];
            allPhasesByModel.set(
                modelIndex,
                order.filter((k) => phases.has(k))
            );
        });
    });

    const items: AccordionItem[] = [];
    sections.forEach((section) => {
        section.indices.forEach((modelIndex) => {
            const phases = allPhasesByModel.get(modelIndex) ?? [];
            const modelName =
                models.find((m) => m.modelId === inputModels[modelIndex]?.modelId)?.displayName ??
                inputModels[modelIndex]?.modelId;
            if (phases.length === 1) {
                items.push({
                    key: `${section.category}-${modelIndex}`,
                    header: `${section.category}: ${modelName}`,
                    content: <CompareSection results={results} modelIndex={modelIndex} phaseKind={phases[0]} />,
                });
            } else {
                phases.forEach((phaseKind) => {
                    items.push({
                        key: `${section.category}-${modelIndex}-${phaseKind}`,
                        header: `${section.category}: ${modelName} — ${phaseLabel(phaseKind)}`,
                        content: <CompareSection results={results} modelIndex={modelIndex} phaseKind={phaseKind} />,
                    });
                });
            }
        });
    });

    const gridInputs: SimulationConcentrations[] = results.map((result, index) => {
        const ranges = Object.fromEntries(result.axes.map((axis) => [axis.substance, axis.range]));
        return {
            id: gridIds[index],
            modelName: modelChainLabel(result),
            concentrations: result.simulations[0]?.input.concentrations ?? {},
            ranges,
        };
    });

    const inputSubstances = Array.from(
        new Set(gridInputs.flatMap((grid) => [...Object.keys(grid.concentrations), ...Object.keys(grid.ranges ?? {})]))
    ).sort();

    return (
        <MainContainer>
            {header}

            <Typography variant="h4" style={{ margin: "1rem 0" }}>
                Input Concentrations
            </Typography>

            <div style={{ marginBottom: "2rem" }}>
                <ConcentrationTable substances={inputSubstances} simulations={gridInputs} highlightDifferences />
            </div>

            <ModelAccordionLayout items={items} />
        </MainContainer>
    );
};

export default CompareGridSimulations;
