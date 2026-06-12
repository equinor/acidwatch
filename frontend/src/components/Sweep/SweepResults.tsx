import React, { useMemo, useState } from "react";
import { Autocomplete, Banner, Table, Typography } from "@equinor/eds-core-react";
import { Link } from "react-router-dom";
import { SweepResults as SweepResultsType } from "@/dto/Sweep";
import { formatConcentration } from "@/functions/Formatting";
import { buildSweepCsv, collectOutputSubstances, defaultSelectedSubstances, pointOutput } from "@/functions/Sweep";
import { optionName } from "@/functions/Substance";
import LineChart, { LineSeries } from "@/components/LineChart";
import DownloadButton from "@/components/DownloadButton";

interface SweepResultsProps {
    sweepResults: SweepResultsType;
}

const SweepResults: React.FC<SweepResultsProps> = ({ sweepResults }) => {
    const { points, sweptSubstance, models } = sweepResults;

    const allSubstances = useMemo(() => collectOutputSubstances(points), [points]);
    const [selectedSubstances, setSelectedSubstances] = useState<string[]>(() => defaultSelectedSubstances(points));

    const erroredPoints = points.filter((point) => point.status === "error");

    const xValues = points.map((point) => point.value);
    const series: LineSeries[] = selectedSubstances.map((substance) => ({
        label: optionName(substance),
        data: points.map((point) => pointOutput(point, substance)),
    }));

    const modelLabel = models.map((model) => model.modelId).join(" → ") || "Unknown model";

    return (
        <>
            <Typography variant="body_short" style={{ marginBottom: "1rem" }}>
                Sweeping <strong>{optionName(sweptSubstance)}</strong> from {xValues[0]} to{" "}
                {xValues[xValues.length - 1]} ppm across {points.length} values using <strong>{modelLabel}</strong>.
            </Typography>

            {erroredPoints.length > 0 && (
                <Banner style={{ marginBottom: "1rem" }}>
                    <Banner.Icon variant="warning">⚠️</Banner.Icon>
                    <Banner.Message>
                        {erroredPoints.length} of {points.length} runs failed and are omitted from the chart.
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
                    xAxisLabel={`${sweptSubstance} (ppm)`}
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
                        <Table.Cell>{sweptSubstance} (ppm)</Table.Cell>
                        {selectedSubstances.map((substance) => (
                            <Table.Cell key={substance}>{optionName(substance)}</Table.Cell>
                        ))}
                        <Table.Cell>Run</Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {points.map((point) => (
                        <Table.Row key={point.simulationId}>
                            <Table.Cell>{point.value}</Table.Cell>
                            {selectedSubstances.map((substance) => (
                                <Table.Cell key={substance}>
                                    {point.status === "done"
                                        ? formatConcentration(point.concentrations[substance])
                                        : point.status === "error"
                                          ? "error"
                                          : "…"}
                                </Table.Cell>
                            ))}
                            <Table.Cell>
                                <Link to={`/simulations/${point.simulationId}`}>open</Link>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", marginBottom: "2rem" }}>
                <DownloadButton
                    csvContent={buildSweepCsv(sweepResults)}
                    fileName={`AcidWatch-Sweep-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                    isLoading={false}
                />
            </div>
        </>
    );
};

export default SweepResults;
