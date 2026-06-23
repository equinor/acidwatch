import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";

export function sortModelsByCategory(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
        if (a.category === "ChemicalEquilibrium" && b.category === "PhaseEquilibrium") return -1;
        if (a.category === "PhaseEquilibrium" && b.category === "ChemicalEquilibrium") return 1;
        return 0;
    });
}

export interface ModelSection {
    category: string;
    modelNames: string[];
    indices: number[];
}

export function buildModelSections(inputModels: ModelInput["models"], availableModels: ModelConfig[]): ModelSection[] {
    const sections: ModelSection[] = [];
    inputModels.forEach((inputModel, index) => {
        const modelConfig = availableModels.find((m) => m.modelId === inputModel.modelId);
        const category = modelConfig?.category ?? "Results";
        const displayName = modelConfig?.displayName ?? inputModel.modelId;
        const existing = sections.find((s) => s.category === category);
        if (existing) {
            existing.indices.push(index);
            existing.modelNames.push(displayName);
        } else {
            sections.push({ category, modelNames: [displayName], indices: [index] });
        }
    });
    return sections;
}
