import { useEffect } from "react";
import { Axis } from "@/dto/GridSimulation";
import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { useGridRangeStore } from "@/hooks/useGridRangeStore";
import { getModelInputStore } from "@/hooks/useModelInputStore";

export const useRestoreSimulationInput = (
    input: ModelInput | undefined,
    axes: Axis[] | undefined,
    availableModels: ModelConfig[],
    setSelectedModels: (models: ModelConfig[]) => void
) => {
    useEffect(() => {
        if (!input || availableModels.length === 0) return;

        const selectedModels = input.models.flatMap((modelInput) => {
            const model = availableModels.find((candidate) => candidate.modelId === modelInput.modelId);
            if (!model) {
                console.warn(`Could not find model ${modelInput.modelId}`);
                return [];
            }

            getModelInputStore(model).getState().reset({ parameters: modelInput.parameters });
            return [model];
        });

        useConcentrationsStore.getState().reset(input.concentrations);
        useConditionsStore.getState().reset(input.conditions);
        useGridRangeStore.getState().reset({ axes });
        setSelectedModels(selectedModels);
    }, [input, axes, availableModels, setSelectedModels]);
};
