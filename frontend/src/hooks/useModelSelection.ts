import { useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";

export type ModelsByCategory = Record<string, ModelConfig | undefined>;

export function useModelSelection() {
    const [selectedModels, setSelectedModels] = useState<ModelsByCategory>({});

    const setModelForCategory = (category: string, model: ModelConfig | undefined) => {
        setSelectedModels((prev) => ({
            ...prev,
            [category]: model,
        }));
    };

    const getSelectedModelsArray = (): ModelConfig[] => {
        return Object.values(selectedModels).filter((m): m is ModelConfig => m !== undefined);
    };

    const clearSelection = () => {
        setSelectedModels({});
    };

    return {
        selectedModels,
        setSelectedModels,
        setModelForCategory,
        getSelectedModelsArray,
        clearSelection,
    };
}
