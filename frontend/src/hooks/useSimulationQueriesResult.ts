import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAvailableModels } from "../contexts/ModelContext";
import { runSimulation } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";
import { filterValidModels } from "../functions/Filtering";
import { SimulationResults } from "../dto/SimulationResults";

export interface UseSimulationQueriesResult {
    data: Record<string, SimulationResults[]>;
    isLoading: boolean;
}

export const useSimulationQueries = (experiments: ExperimentResult[]): UseSimulationQueriesResult => {
    const [simulationCache, setSimulationCache] = useState<Record<string, SimulationResults>>({});
    const { models } = useAvailableModels();

    const simulationQueries = useQueries({
        queries: experiments.flatMap((experiment) => {
            const filteredModels = filterValidModels(experiment, models);
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );

            return filteredModels.map((model) => ({
                queryKey: ["simulation", experiment.name, model.modelId, experiments.sort().join(",")],
                queryFn: async (): Promise<Record<string, SimulationResults>> => {
                    const cacheKey = `${experiment.name}_${model.modelId}`;

                    if (simulationCache[cacheKey]) {
                        return { [experiment.name]: simulationCache[cacheKey] };
                    }

                    try {
                        const simulation = await runSimulation({
                            concentrations: filteredConcs,
                            parameters:
                                model.parameters && Object.keys(model.parameters).length > 0
                                    ? {
                                          pressure: experiment.pressure ?? 0,
                                          temperature: 273 + (experiment.temperature ?? 0), // Convert to Kelvin
                                      }
                                    : {},
                            modelId: model.modelId,
                        });

                        setSimulationCache((prev) => ({
                            ...prev,
                            [cacheKey]: simulation,
                        }));
                        return { [experiment.name]: simulation };
                    } catch (error) {
                        console.error(
                            `Simulation failed for ${experiment.name} with model ${model.displayName}:`,
                            error
                        );
                        throw error;
                    }
                },
                enabled: experiments.length > 0 && models.length > 0,
                retry: 1,
                staleTime: Infinity,
            }));
        }),
        combine: (results) => {
            const groupedResults: Record<string, SimulationResults[]> = {};

            results
                .filter((result) => result.isSuccess && result.data)
                .forEach((result) => {
                    Object.entries(result.data!).forEach(([experimentName, simResult]) => {
                        if (!groupedResults[experimentName]) {
                            groupedResults[experimentName] = [];
                        }
                        groupedResults[experimentName].push(simResult);
                    });
                });
            const isLoading = results.some((result) => result.isLoading);
            return {
                data: groupedResults,
                isLoading,
                experiments,
            };
        },
    });

    return simulationQueries;
};
