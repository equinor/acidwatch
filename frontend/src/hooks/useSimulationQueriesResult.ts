import { useQueries } from "@tanstack/react-query";
import { useAvailableModels } from "@/contexts/ModelContext";
import { getResultForSimulation, ResultIsPending, startSimulation } from "@/api/api";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { filterValidModels } from "@/functions/Filtering";
import { SimulationResults } from "@/dto/SimulationResults";
import { ModelConfig } from "@/dto/FormConfig";

export type UseSimulationQueriesResult = {
    data: Record<string, SimulationResults[]>;
    isLoading: boolean;
};

export type QueryResult<T> = {
    result: T;
    experiment: ExperimentResult;
    modelId: string;
};

export const useSimulationQueries = (experiments: ExperimentResult[]): UseSimulationQueriesResult => {
    const { models } = useAvailableModels();

    const simulationsToRun: { experiment: ExperimentResult; model: ModelConfig }[] = experiments.flatMap((experiment) =>
        filterValidModels(experiment, models).map((model) => ({ experiment, model }))
    );

    const simulationIds: QueryResult<string>[] = useQueries({
        queries: simulationsToRun.map(({ experiment, model }) => {
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );

            return {
                queryKey: ["simulation", experiment.name, model.modelId],
                queryFn: async (): Promise<QueryResult<string>> => ({
                    result: await startSimulation({
                        concentrations: filteredConcs,
                        parameters:
                            model.parameters && Object.keys(model.parameters).length > 0
                                ? {
                                      pressure: experiment.pressure ?? 0,
                                      temperature: 273 + (experiment.temperature ?? 0),
                                  }
                                : {},
                        modelId: model.modelId,
                    }),
                    modelId: model.modelId,
                    experiment: experiment,
                }),
                retryOnMount: false,
                gcTime: Infinity,
            };
        }),
        combine: (queryResults) => queryResults.filter((value) => value.isSuccess).map((value) => value.data),
    });

    return useQueries({
        queries: simulationIds.map((simulationId) => ({
            queryKey: ["results", simulationId.result],
            queryFn: async (): Promise<QueryResult<SimulationResults>> => ({
                ...simulationId,
                result: await getResultForSimulation(simulationId.result),
            }),
            retry: (_failureCount: number, error: Error): boolean => error instanceof ResultIsPending,
        })),
        combine: (queryResults) => {
            const data: Record<string, SimulationResults[]> = {};

            queryResults.forEach((result, simulationIndex) => {
                const simulation = simulationsToRun[simulationIndex];
                if (result.isLoading) {
                    (data[simulation.experiment.name] ??= []).push({
                        status: "pending",
                        finalConcentrations: {},
                        modelInput: {
                            modelId: simulation.model.modelId,
                            parameters: simulation.model.parameters
                                ? Object.fromEntries(
                                      Object.entries(simulation.model.parameters).map(([key, value]) => [
                                          key,
                                          value.default,
                                      ])
                                  )
                                : {},
                            concentrations: Object.fromEntries(
                                Object.entries(simulation.experiment.initialConcentrations).filter(
                                    ([, value]) => Number(value) !== 0
                                )
                            ),
                        },
                        panels: [],
                    });
                }

                if (result.data) {
                    (data[result.data.experiment.name] ??= []).push(result.data.result);
                }
            });

            const isLoading =
                queryResults.length !== simulationsToRun.length || queryResults.some((value) => value.isLoading);

            return { data, isLoading };
        },
    });
};
