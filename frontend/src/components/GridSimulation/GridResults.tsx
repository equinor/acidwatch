import React, { useMemo, useState } from "react";
import { Autocomplete, Banner, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { Phase } from "@/dto/SimulationResults";
import {
    buildGridCsv,
    collectOutputSubstances,
    defaultSelectedSubstances,
    pointOutput,
    visiblePhaseKinds,
} from "@/components/GridSimulation/gridSimulationUtils";
import { optionName } from "@/functions/Substance";
import LineChart, { LineSeries } from "@/components/LineChart";
import DownloadButton from "@/components/DownloadButton";
import { useAvailableModels } from "@/contexts/ModelContext";
import { buildModelSections, phaseLabel } from "@/utils/modelUtils";
import ModelAccordionLayout, { AccordionItem } from "@/components/ModelAccordionLayout";
import GridPhaseTable from "@/components/GridSimulation/GridPhaseTable";

interface GridResultsProps {
    result: GridSimulationResult;
}

interface GridPhaseChartProps {
    result: GridSimulationResult;
    modelIndex: number;
    phaseKind: Phase["kind"];
}

const GridPhaseChart: React.FC<GridPhaseChartProps> = ({ result, modelIndex, phaseKind }) => {
    const { simulations } = result;

    const allSubstances = useMemo(
        () => collectOutputSubstances(simulations, modelIndex, phaseKind),
        [simulations, modelIndex, phaseKind]
    );
    const [selection, setSelection] = useState<string[] | null>(null);
    const selectedSubstances = selection ?? defaultSelectedSubstances(simulations, modelIndex, phaseKind);

    const xAxisSubstance = result.axes[0]?.substance ?? "Unknown";
    const xValues = simulations.map((sim) => parseFloat(sim.input.concentrations[xAxisSubstance].toFixed(2)) ?? 0);
    const series: LineSeries[] = selectedSubstances.map((substance) => ({
        label: optionName(substance),
        data: simulations.map((sim) => pointOutput(sim, substance, modelIndex, phaseKind)),
    }));

    return (
        <>
            <Autocomplete
                label="Output substances"
                options={allSubstances}
                selectedOptions={selectedSubstances}
                multiple
                onOptionsChange={({ selectedItems }) => setSelection(selectedItems)}
                optionLabel={optionName}
                style={{ maxWidth: "400px", marginBottom: "1rem" }}
            />

            {series.length === 0 ? (
                <Typography variant="body_short" italic>
                    Select at least one output substance to chart.
                </Typography>
            ) : (
                <LineChart
                    xValues={xValues}
                    series={series}
                    xAxisLabel={`${xAxisSubstance} (ppm)`}
                    yAxisLabel={`Output concentration (${phaseKind === "aqueous" ? "wt%" : "ppm·mol"})`}
                    aspectRatio={2}
                />
            )}

            <Typography variant="h5" style={{ margin: "1.5rem 0 1rem" }}>
                Values
            </Typography>

            <GridPhaseTable
                result={result}
                modelIndex={modelIndex}
                phaseKind={phaseKind}
                substances={selectedSubstances}
            />
        </>
    );
};

interface GridSectionProps {
    result: GridSimulationResult;
    modelIndex: number;
}

const GridSection: React.FC<GridSectionProps> = ({ result, modelIndex }) => {
    const phases = visiblePhaseKinds(result.simulations, modelIndex);

    if (phases.length === 1) {
        return <GridPhaseChart result={result} modelIndex={modelIndex} phaseKind={phases[0]} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {phases.map((kind) => (
                <div key={kind}>
                    <Typography variant="h5" style={{ marginBottom: "0.5rem" }}>
                        {phaseLabel(kind)}
                    </Typography>
                    <GridPhaseChart result={result} modelIndex={modelIndex} phaseKind={kind} />
                </div>
            ))}
        </div>
    );
};

const GridResults: React.FC<GridResultsProps> = ({ result }) => {
    const { simulations } = result;
    const { models } = useAvailableModels();

    const firstSim = simulations[0];
    const inputModels = firstSim?.input.models ?? [];

    const sections = buildModelSections(inputModels, models);

    const erroredSimulations = simulations.filter((sim) => sim.status === "error");
    const doneSimulations = simulations.filter((sim) => sim.status === "done");
    const allFinished = doneSimulations.length + erroredSimulations.length === simulations.length;

    const xAxisSubstance = result.axes[0]?.substance ?? "Unknown";
    const modelLabel = inputModels.map((model) => model.modelId).join(" → ") || "Unknown model";

    const items: AccordionItem[] = sections.flatMap((section) =>
        section.indices.map((modelIndex) => ({
            key: `${section.category}-${modelIndex}`,
            header: `${section.category}: ${models.find((m) => m.modelId === inputModels[modelIndex]?.modelId)?.displayName ?? inputModels[modelIndex]?.modelId}`,
            content: <GridSection result={result} modelIndex={modelIndex} />,
        }))
    );

    return (
        <>
            <Typography variant="body_short" style={{ marginBottom: "1rem" }}>
                Varying <strong>{optionName(xAxisSubstance)}</strong> across {simulations.length} values using{" "}
                <strong>{modelLabel}</strong>.
            </Typography>

            {!allFinished && (
                <Banner style={{ marginBottom: "1rem" }}>
                    <Banner.Icon variant="info">⏳</Banner.Icon>
                    <Banner.Message>
                        Showing partial results. {doneSimulations.length} of {simulations.length} runs have finished;
                        the rest appear as they complete.
                    </Banner.Message>
                </Banner>
            )}

            {erroredSimulations.length > 0 && (
                <Banner style={{ marginBottom: "1rem" }}>
                    <Banner.Icon variant="warning">⚠️</Banner.Icon>
                    <Banner.Message>
                        {erroredSimulations.length} of {simulations.length} runs failed and are omitted from the chart.
                    </Banner.Message>
                </Banner>
            )}

            <ModelAccordionLayout items={items} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", marginBottom: "2rem" }}>
                <DownloadButton
                    csvContent={buildGridCsv(result)}
                    fileName={`AcidWatch-Grid-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                    isLoading={false}
                />
            </div>
        </>
    );
};

export default GridResults;
