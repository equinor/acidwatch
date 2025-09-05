import React, { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Autocomplete, AutocompleteChanges, Card, Typography } from "@equinor/eds-core-react";
import ResultScatterGraph from "./ResultScatterPlot";
import { convertSimulationToGraphData, ExperimentResult_to_ScatterGraphData } from "../functions/Formatting";
import { useAvailableModels } from "../contexts/ModelContext";
import { runSimulation } from "../api/api";
import { ScatterGraphData } from "../dto/ScatterGraphInput";
import { ExperimentResult } from "../dto/ExperimentResult";
import { filterGraphDataByComponents, filterValidModels } from "../functions/Filtering";

interface LabResultsPlotProps {
    selectedExperiments: ExperimentResult[];
}

const LabResultsPlot: React.FC<LabResultsPlotProps> = ({ selectedExperiments }) => {
    const [plotComponents, setPlotComponents] = useState<string[]>([]);
    const [simulationCache, setSimulationCache] = useState<Record<string, ScatterGraphData[]>>({});
    const { models } = useAvailableModels();

    const simulationQueries = useQueries({
        queries: selectedExperiments.flatMap((experiment) => {
            const filteredModels = filterValidModels(experiment, models);
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );
            return filteredModels.map((model) => ({
                queryKey: ["simulation", experiment.name, model.modelId, selectedExperiments.sort().join(",")],
                queryFn: async (): Promise<ScatterGraphData[]> => {
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

                        const result = convertSimulationToGraphData(simulation, model, experiment);

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
                        return [];
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

    const combinedGraphData = useMemo(
        () => [...ExperimentResult_to_ScatterGraphData(selectedExperiments), ...simulationQueries.data],
        [selectedExperiments, simulationQueries.data]
    );

    const filteredComponentGraphData = useMemo(
        () =>
            filterGraphDataByComponents(
                combinedGraphData.filter((d): d is ScatterGraphData => d !== undefined),
                plotComponents
            ),
        [combinedGraphData, plotComponents]
    );

    const handlePlotComponentsChange = (changes: AutocompleteChanges<string>) => {
        setPlotComponents(changes.selectedItems);
    };

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

            <Typography variant="h2">Plot summary</Typography>
            <ResultScatterGraph graphData={combinedGraphData.filter((d): d is ScatterGraphData => d !== undefined)} />

            <Typography variant="h2">Plot per component</Typography>
            <div style={{ width: "500px", marginBottom: "1rem" }}>
                <Autocomplete
                    label={"Select multiple components"}
                    options={Array.from(
                        new Set(selectedExperiments.flatMap((entry) => [...Object.keys(entry.finalConcentrations)]))
                    )}
                    multiple
                    onOptionsChange={handlePlotComponentsChange}
                />
            </div>
            <ResultScatterGraph graphData={filteredComponentGraphData} />
        </>
    );
};

export default LabResultsPlot;
