import React, { useMemo, useState } from "react";
import { Autocomplete, Banner, Table, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { formatConcentration } from "@/functions/Formatting";
import {
    buildGridCsv,
    collectOutputSubstances,
    defaultSelectedSubstances,
    pointOutput,
    visiblePhaseKinds,
} from "@/functions/GridSimulation";
import { optionName } from "@/functions/Substance";
import LineChart, { LineSeries } from "@/components/LineChart";
import DownloadButton from "@/components/DownloadButton";
import { useAvailableModels } from "@/contexts/ModelContext";
import { buildModelSections, phaseLabel } from "@/utils/modelUtils";
import ModelAccordionLayout, { AccordionItem } from "@/components/ModelAccordionLayout";

interface GridResultsProps {
    result: GridSimulationResult;
}

interface GridPhaseChartProps {
    result: GridSimulationResult;
    modelIndex: number;
    phaseKind: string;
}

const GridPhaseChart: React.FC<GridPhaseChartProps> = ({ result, modelIndex, phaseKind }) => {
    const { simulations, axes } = result;

    const allSubstances = useMemo(
        () => collectOutputSubstances(simulations, modelIndex, phaseKind),
        [simulations, modelIndex, phaseKind]
    );
    const [selectedSubstances, setSelectedSubstances] = useState<string[]>(() =>
        defaultSelectedSubstances(simulations, modelIndex, phaseKind)
    );

    const xAxisSubstance = axes[0]?.substance ?? "Unknown";
    const xValues = simulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0);
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
                onOptionsChange={({ selectedItems }) => setSelectedSubstances(selectedItems)}
                optionLabel={optionName}
                style={{ maxWidth: "400px", marginBottom: "1rem" }}
            />

            {series.length === 0 ? (
                <Typography variant="body_short" italic>
                    Select at least one output substance to plot.
                </Typography>
            ) : (
                <LineChart
                    xValues={xValues}
                    series={series}
                    xAxisLabel={`${xAxisSubstance} (ppm)`}
                    yAxisLabel={`Output concentration (${phaseKind === "aqueous" ? "wt%" : "ppm"})`}
                    aspectRatio={2}
                />
            )}

            <Typography variant="h5" style={{ margin: "1.5rem 0 1rem" }}>
                Values
            </Typography>

            <Table>
                <Table.Head>
                    <Table.Row>
                        {axes.map((axis) => (
                            <Table.Cell key={axis.substance}>{axis.substance} (ppm)</Table.Cell>
                        ))}
                        {selectedSubstances.map((substance) => (
                            <Table.Cell key={substance}>{optionName(substance)}</Table.Cell>
                        ))}
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {simulations.map((sim, idx) => (
                        <Table.Row key={idx}>
                            {axes.map((axis) => (
                                <Table.Cell key={axis.substance}>
                                    {sim.input.concentrations[axis.substance] ?? 0}
                                </Table.Cell>
                            ))}
                            {selectedSubstances.map((substance) => (
                                <Table.Cell key={substance}>
                                    {sim.status === "done"
                                        ? formatConcentration(pointOutput(sim, substance, modelIndex, phaseKind) ?? 0)
                                        : sim.status === "error"
                                          ? "error"
                                          : "…"}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
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
    const { simulations, axes } = result;
    const { models } = useAvailableModels();

    const firstSim = simulations[0];
    const inputModels = firstSim?.input.models ?? [];

    const sections = buildModelSections(inputModels, models);

    const erroredSimulations = simulations.filter((sim) => sim.status === "error");

    const xAxisSubstance = axes[0]?.substance ?? "Unknown";
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
