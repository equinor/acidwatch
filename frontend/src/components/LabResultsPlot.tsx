import React, { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Card, Typography } from "@equinor/eds-core-react";
import { useAvailableModels } from "../contexts/ModelContext";
import { runSimulation } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";
import { filterValidModels } from "../functions/Filtering";
import { ChartDataSet } from "../dto/ChartData";
import BarChart from "./BarChart";
import { convertSimulationToChartData } from "../functions/Formatting";

interface LabResultsPlotProps {
    selectedExperiments: ExperimentResult[];
}

const LabResultsPlot: React.FC<LabResultsPlotProps> = ({ selectedExperiments }) => {
    const [plotComponents, setPlotComponents] = useState<string[]>([]);
    const [simulationCache, setSimulationCache] = useState<Record<string, ChartDataSet>>({});
    const { models } = useAvailableModels();

    const simulationQueries = useQueries({
        queries: selectedExperiments.flatMap((experiment) => {
            const filteredModels = filterValidModels(experiment, models);
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );
            return filteredModels.map((model) => ({
                queryKey: ["simulation", experiment.name, model.modelId, selectedExperiments.sort().join(",")],
                queryFn: async (): Promise<ChartDataSet> => {
                    const cacheKey = `${experiment.name}_${model.modelId}`;
                    if (simulationCache[cacheKey]) {
                        return simulationCache[cacheKey];
                    }
                    try {
                        const simulation = await runSimulation(
                            filteredConcs,
                            model.parameters && Object.keys(model.parameters).length > 0
                                ? {
                                      pressure: experiment.pressure ?? 0,
                                      temperature: 273 + (experiment.temperature ?? 0), // Convert to Kelvin
                                  }
                                : {},
                            model.modelId
                        );

                        const result = convertSimulationToChartData(simulation, model.displayName, experiment.name);
                        setSimulationCache((prev) => ({
                            ...prev,
                            [cacheKey]: result,
                        }));

                        return result;
                    } catch (error) {
                        console.error(
                            `Simulation failed for ${experiment.name} with model ${model.displayName}:`,
                            error
                        );
                        throw error;
                    }
                },
                enabled: selectedExperiments.length > 0 && models.length > 0,
                retry: 1,
                staleTime: Infinity,
            }));
        }),
        combine: (results) => {
            const allSimResults = results
                .filter((result) => result.isSuccess && result.data)
                .flatMap((result) => result.data);

            const isLoading = results.some((result) => result.isLoading);
            const hasErrors = results.some((result) => result.isError);

            return {
                data: allSimResults,
                isLoading,
                hasErrors,
            };
        },
    });

    const chartDatasets: ChartDataSet[] = useMemo(() => {
        const experimentDatasets = selectedExperiments.map((exp) => ({
            label: exp.name,
            data: Object.entries(exp.finalConcentrations).map(([x, y]) => ({ x, y })),
        }));

        return [...experimentDatasets, ...simulationQueries.data].filter((ds): ds is ChartDataSet => ds !== undefined);
    }, [selectedExperiments, simulationQueries.data]);

    const simulationStatusInfo = (
        <Card style={{ margin: "2rem 0" }}>
            <Card.Content>
                <Typography variant="body_short">
                    {simulationQueries.isLoading ? "Running simulations..." : ""}
                </Typography>
            </Card.Content>
        </Card>
    );

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
                Plot selected components
                {Array.from(
                    new Set(selectedExperiments.flatMap((entry) => [...Object.keys(entry.finalConcentrations)]))
                ).map((component) => (
                    <label key={component} style={{ marginRight: "16px" }}>
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
