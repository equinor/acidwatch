import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAvailableModels } from "@/contexts/ModelContext";
import { getResultForSimulation, ResultIsPending, startSimulation } from "@/api/api";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { SimulationResults } from "@/dto/SimulationResults";
import { useState } from "react";
import { filterValidModels } from "@/functions/Filtering";

export type Status = {
    status: "starting" | "pending" | "done" | "failed";
    simulationId?: string;
    error?: any;
    result?: SimulationResults;
};

export const useSimulationQueries = (): {
    startExperiment: (experiment: ExperimentResult, modelId: string) => void;
    statuses: Record<string, Status>;
} => {
    const { models } = useAvailableModels();
    const [statuses, setStatuses] = useState<Record<string, Status>>({});

    const queryClient = useQueryClient();

    const updateStatus = (key: string, update: Partial<Status>) =>
        setStatuses((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }));

    const { mutate: startExperiment } = useMutation({
        mutationFn: async ({ experiment, modelId }: { experiment: ExperimentResult; modelId: string }) => {
            const key = `${experiment.name}:${modelId}`;
            if (statuses[key] !== undefined) {
                /* Already started so we're done */
                return;
            }

            const model = models.find((m) => m.modelId === modelId);
            if (model === undefined) {
                console.error(`Tried to start experiment with invalid modelId ${modelId}`);
                return;
            }

            if (filterValidModels(experiment, [model!]).length === 0) {
                return;
            }

            const status: Status = {
                status: "starting",
            };
            updateStatus(key, status);

            const concentrations = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );
            const parameters = {
                pressure: experiment?.pressure ?? 0,
                temperature: 273 + (experiment.temperature ?? 0),
            };

            let simulationId: string = "";
            try {
                simulationId = await startSimulation({
                    concentrations,
                    parameters,
                    modelId,
                });
                updateStatus(key, { status: "pending", simulationId });
            } catch (error) {
                updateStatus(key, { status: "failed", error });
            }

            if (!simulationId) return;

            try {
                const result = await queryClient.fetchQuery({
                    queryKey: ["simulation", simulationId],
                    queryFn: () => getResultForSimulation(simulationId),
                    retry: (_retryCount, error) => error instanceof ResultIsPending,
                });
                updateStatus(key, { status: "done", result });
            } catch (error) {
                updateStatus(key, { status: "failed", error });
            }
        },
    });

    return { statuses, startExperiment: (experiment, modelId) => startExperiment({ experiment, modelId }) };
};
