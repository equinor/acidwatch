import React, { useState } from "react";
import { Typography } from "@equinor/eds-core-react";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { ChartDataSet } from "@/dto/ChartData";
import BarChart from "./BarChart";
import { SimulationResults } from "@/dto/SimulationResults";
import { convertSimulationToChartData } from "@/functions/Formatting";
import { getLabResultColor, EXPERIMENT_PATTERNS } from "@/functions/Colors";

interface LabResultsPlotProps {
    selectedExperiments: ExperimentResult[];
    simulationsPerExperiment: Record<string, SimulationResults[]>;
}

const LabResultsPlot: React.FC<LabResultsPlotProps> = ({
    selectedExperiments,
    simulationsPerExperiment: simulationQueries,
}) => {
    const [plotComponents, setPlotComponents] = useState<string[]>([]);

    const chartDatasets: ChartDataSet[] = [];
    selectedExperiments.forEach((exp, expIdx) => {
        chartDatasets.push({
            label: exp.name,
            color: getLabResultColor(expIdx, 0),
            pattern: EXPERIMENT_PATTERNS[expIdx % EXPERIMENT_PATTERNS.length],
            data: Object.entries(exp.finalConcentrations)
                .filter(([, concentration]) => Number(concentration) !== 0)
                .map(([x, y]) => ({ x, y }))
                .sort((a, b) => a.x.localeCompare(b.x)),
        });
        const simulations = simulationQueries[exp.name] ?? [];
        simulations.forEach((simulation, simIdx) => {
            const chartDataSet = convertSimulationToChartData(simulation, exp.name);
            chartDataSet.label = `– ${chartDataSet.label}`;
            chartDataSet.color = getLabResultColor(expIdx, simIdx + 1);
            chartDataSet.pattern = EXPERIMENT_PATTERNS[expIdx % EXPERIMENT_PATTERNS.length];
            chartDatasets.push(chartDataSet);
        });
    });

    const allComponents = Array.from(new Set(chartDatasets.flatMap((ds) => ds.data.map((point) => point.x)))).sort();

    if (selectedExperiments.length === 0) {
        return (
            <Typography variant="body_short" style={{ margin: "2rem 0" }}>
                Select experiments from the table below to view comparison plots.
            </Typography>
        );
    }

    return (
        <>
            <BarChart
                graphData={chartDatasets.map((ds) => ({
                    ...ds,
                    data: ds.data.filter((point) => plotComponents.length === 0 || plotComponents.includes(point.x)),
                }))}
                aspectRatio={4}
                yLabel="Concentration (ppm)"
                xLabel="Components"
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
