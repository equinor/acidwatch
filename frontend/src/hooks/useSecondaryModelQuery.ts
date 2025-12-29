import { useQuery } from "@tanstack/react-query";
import { startSimulation, getResultForSimulation, ResultIsPending } from "@/api/api";
import { ModelConfig } from "@/dto/FormConfig";
import { SimulationResults } from "@/dto/SimulationResults";
import {
    filterAcidWithLowConcentration,
    filterInValidAndUndefinedSubstances,
    getValidParametersForSecondaryModel,
} from "@/functions/Filtering";

interface UseSecondaryModelQueryOptions {
    primaryResults?: SimulationResults;
    secondaryModel?: ModelConfig;
    enabled?: boolean;
}

export const useSecondaryModelQuery = ({
    primaryResults,
    secondaryModel,
    enabled = true,
}: UseSecondaryModelQueryOptions) => {
    const {
        data: secondarySimulationId,
        isLoading: isStartingSecondary,
        error: startError,
    } = useQuery({
        queryKey: ["start-secondary-simulation", secondaryModel?.modelId, primaryResults?.modelInput.modelId],
        queryFn: async () => {
            let validConcentrations = filterInValidAndUndefinedSubstances(
                primaryResults?.finalConcentrations ?? {},
                secondaryModel?.validSubstances
            );

            const validParameters = getValidParametersForSecondaryModel(
                primaryResults?.modelInput.parameters,
                Object.keys(secondaryModel?.parameters || {})
            );
            validConcentrations = filterAcidWithLowConcentration(validConcentrations);

            if (Object.keys(validConcentrations).length === 0) {
                throw new Error(
                    `No compatible concentrations found for ${secondaryModel?.displayName ?? "unknown model"}`
                );
            }

            return await startSimulation({
                modelId: secondaryModel!.modelId,
                concentrations: validConcentrations,
                parameters: validParameters ?? {},
            });
        },
        enabled:
            enabled && !!primaryResults?.finalConcentrations && !!secondaryModel && primaryResults.status === "done",
        retry: 1000,
        staleTime: 0,
    });

    const {
        data: secondaryResults,
        isLoading: isLoadingSecondaryResults,
        error: resultsError,
    } = useQuery({
        queryKey: ["secondary-simulation-results", secondarySimulationId],
        queryFn: () => getResultForSimulation(secondarySimulationId!),
        enabled: !!secondarySimulationId,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    return {
        secondaryResults,
        isSecondaryLoading: isStartingSecondary || isLoadingSecondaryResults,
        secondaryError: startError || resultsError,
        hasSecondaryResults: !!secondaryResults,
        secondarySimulationId,
    };
};
export default useSecondaryModelQuery;
