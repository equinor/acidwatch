import React, { useMemo, useState } from "react";
import { Autocomplete, Banner, Table, Typography } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { formatConcentration } from "@/functions/Formatting";
import {
    buildGridCsv,
    collectOutputSubstances,
    defaultSelectedSubstances,
    pointOutput,
} from "@/functions/GridSimulation";
import { optionName } from "@/functions/Substance";
import LineChart, { LineSeries } from "@/components/LineChart";
import DownloadButton from "@/components/DownloadButton";

interface GridResultsProps {
    result: GridSimulationResult;
}

const GridResults: React.FC<GridResultsProps> = ({ result }) => {
    const { simulations, axes } = result;

    const firstSim = simulations[0];
    const models = firstSim?.input.models ?? [];

    const allSubstances = useMemo(() => collectOutputSubstances(simulations), [simulations]);
    const [selectedSubstances, setSelectedSubstances] = useState<string[]>(() =>
        defaultSelectedSubstances(simulations)
    );

    const erroredSimulations = simulations.filter((sim) => sim.status === "error");

    const xAxisSubstance = axes[0]?.substance ?? "Unknown";
    const xValues = simulations.map((sim) => sim.input.concentrations[xAxisSubstance] ?? 0);
    const series: LineSeries[] = selectedSubstances.map((substance) => ({
        label: optionName(substance),
        data: simulations.map((sim) => pointOutput(sim, substance)),
    }));

    const modelLabel = models.map((model) => model.modelId).join(" → ") || "Unknown model";

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
                    yAxisLabel="Output concentration (ppm)"
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
                                        ? formatConcentration(pointOutput(sim, substance))
                                        : sim.status === "error"
                                          ? "error"
                                          : "…"}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>

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
