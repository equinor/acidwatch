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
import LineChart, { LineSeries } from "@/components/Charts/LineChart";
import DownloadButton from "@/components/DownloadButton";
import { useAvailableModels } from "@/contexts/ModelContext";
import { modelChainLabel, phaseUnit } from "@/utils/modelUtils";
import ModelAccordionLayout from "@/components/ModelAccordionLayout";
import PhaseSections from "@/components/PhaseSections";
import { buildModelAccordionItems } from "@/utils/accordionItems";
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
                    yAxisLabel={`Output concentration (${phaseUnit(phaseKind)})`}
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

const GridSection: React.FC<GridSectionProps> = ({ result, modelIndex }) => (
    <PhaseSections
        phaseKinds={visiblePhaseKinds(result.simulations, modelIndex)}
        renderPhase={(phaseKind) => <GridPhaseChart result={result} modelIndex={modelIndex} phaseKind={phaseKind} />}
    />
);

const GridResults: React.FC<GridResultsProps> = ({ result }) => {
    const { simulations } = result;
    const { models } = useAvailableModels();

    const firstSim = simulations[0];
    const inputModels = firstSim?.input.models ?? [];

    const erroredSimulations = simulations.filter((sim) => sim.status === "error");
    const doneSimulations = simulations.filter((sim) => sim.status === "done");
    const allFinished = doneSimulations.length + erroredSimulations.length === simulations.length;

    const xAxisSubstance = result.axes[0]?.substance ?? "Unknown";
    const modelLabel = modelChainLabel(inputModels);

    const items = buildModelAccordionItems(inputModels, models, (modelIndex) => (
        <GridSection result={result} modelIndex={modelIndex} />
    ));

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
