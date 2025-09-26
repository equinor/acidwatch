import React, { useState, useMemo } from "react";
import { Card, Typography } from "@equinor/eds-core-react";
import { ExperimentResult } from "../dto/ExperimentResult";
import { ChartDataSet } from "../dto/ChartData";
import BarChart from "./BarChart";

interface LabResultsPlotProps {
    selectedExperiments: ExperimentResult[];
    simulationQueries: ChartDataSet[];
    isLoading: boolean;
}

const LabResultsPlot: React.FC<LabResultsPlotProps> = ({ selectedExperiments, simulationQueries, isLoading }) => {
    const [plotComponents, setPlotComponents] = useState<string[]>([]);

    const chartDatasets: ChartDataSet[] = useMemo(() => {
        const experimentDatasets = selectedExperiments.map((exp) => ({
            label: exp.name,
            data: Object.entries(exp.finalConcentrations).map(([x, y]) => ({ x, y })),
        }));

        return [...experimentDatasets, ...simulationQueries].filter((ds): ds is ChartDataSet => ds !== undefined);
    }, [selectedExperiments, simulationQueries]);

    const simulationStatusInfo = (
        <Card style={{ margin: "2rem 0" }}>
            <Card.Content>
                <Typography variant="body_short">{isLoading ? "Running simulations..." : ""}</Typography>
            </Card.Content>
        </Card>
    );

    const allComponents = Array.from(new Set(chartDatasets.flatMap((ds) => ds.data.map((point) => point.x))));

    if (selectedExperiments.length === 0) {
        return (
            <Typography variant="body_short" style={{ margin: "2rem 0" }}>
                Select experiments from the table below to view comparison plots.
            </Typography>
        );
    }

    return (
        <>
            {simulationStatusInfo}

            <BarChart
                graphData={chartDatasets.map((ds) => ({
                    ...ds,
                    data: ds.data.filter((point) => plotComponents.length === 0 || plotComponents.includes(point.x)),
                }))}
                aspectRatio={4}
            />
            <div style={{ marginBottom: "20px" }}>
                Plot subset of components:{" "}
                {allComponents.map((component) => (
                    <label key={component} style={{ marginRight: "12px", fontSize: "0.75rem" }}>
                        <input
                            type="checkbox"
                            checked={plotComponents.includes(component)}
                            onChange={(e) => {
                                setPlotComponents((prev) =>
                                    e.target.checked ? [...prev, component] : prev.filter((c) => c !== component)
                                );
                            }}
                        />
                        {component}
                    </label>
                ))}
            </div>
        </>
    );
};

export default LabResultsPlot;
