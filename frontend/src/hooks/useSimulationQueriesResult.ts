import { useQueries } from "@tanstack/react-query";
import { useAvailableModels } from "../contexts/ModelContext";
import { startSimulation, getResultForSimulation, NotFoundError } from "../api/api";
import { ExperimentResult } from "../dto/ExperimentResult";
import { filterValidModels } from "../functions/Filtering";
import { SimulationResults } from "../dto/SimulationResults";

const MAX_RETRIES = 100;

export interface UseSimulationQueriesResult {
    data: SimulationResults[];
    isLoading: boolean;
    experiments: ExperimentResult[];
}

export const useSimulationQueries = (experiments: ExperimentResult[]): UseSimulationQueriesResult => {
    const { models } = useAvailableModels();

    const simulationQueries = useQueries({
        queries: experiments.flatMap((experiment) => {
            const filteredModels = filterValidModels(experiment, models);
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );

            return filteredModels.map((model) => ({
                queryKey: ["simulation", experiment.name, model.modelId],
                queryFn: async (): Promise<SimulationResults> => {
                    let simulationId: string = "";
                    try {
                        simulationId = await startSimulation({
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
                    } catch (error) {
                        console.error(
                            `Simulation failed to start for ${experiment.name} with model ${model.displayName}:`,
                            error
                        );
                        throw error;
                    }

                    for (let i = 0; i < MAX_RETRIES; i++) {
                        try {
                            const result = await getResultForSimulation(simulationId);

                            if (result.errors) {
                                throw new Error(JSON.stringify(result.errors));
                            }

                            return result;
                        } catch (error) {
                            console.error(error);
                            if (error instanceof NotFoundError) {
                                await new Promise((resolve) => setTimeout(resolve, 1000));
                            } else {
                                throw error;
                            }
                        }
                    }

                    const error = new Error(
                        `Simulation timed out for ${experiment.name} with model ${model.displayName}:`
                    );
                    console.error(error.message);
                    throw error;
                },
                enabled: experiments.length > 0 && models.length > 0,
                retry: 1,
                staleTime: Infinity,
            }));
        }),
        combine: (results) => {
            const allSimResults = results
                .filter((result) => result.isSuccess && result.data)
                .flatMap((result) => result.data)
                .filter((data) => data !== undefined);

            const isLoading = results.some((result) => result.isLoading);
            return {
                data: allSimResults,
                isLoading,
                experiments,
            };
        },
    });

    return simulationQueries;
};
