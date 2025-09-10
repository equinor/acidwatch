import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAvailableModels } from "../contexts/ModelContext";
import { runSimulation } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";
import { filterValidModels } from "../functions/Filtering";
import { ChartDataSet } from "../dto/ChartData";
import { convertSimulationToChartData } from "../functions/Formatting";

interface UseSimulationQueriesResult {
    data: ChartDataSet[];
    isLoading: boolean;
    hasErrors: boolean;
}

export const useSimulationQueries = (selectedExperiments: ExperimentResult[]): UseSimulationQueriesResult => {
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
                .flatMap((result) => result.data)
                .filter((data): data is ChartDataSet => data !== undefined);

            const isLoading = results.some((result) => result.isLoading);
            const hasErrors = results.some((result) => result.isError);

            return {
                data: allSimResults,
                isLoading,
                hasErrors,
            };
        },
    });

    return simulationQueries;
};
