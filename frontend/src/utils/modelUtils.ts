import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { GridSimulationResult } from "@/dto/GridSimulation";

export function sortModelsByCategory(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
        if (a.category === "ChemicalEquilibrium" && b.category === "PhaseEquilibrium") return -1;
        if (a.category === "PhaseEquilibrium" && b.category === "ChemicalEquilibrium") return 1;
        return 0;
    });
}

export interface StageSection {
    category: string;
    index: number | undefined;
}

export function buildStageSections(inputModels: ModelInput["models"], availableModels: ModelConfig[]): StageSection[] {
    const categories = new Set(sortModelsByCategory(availableModels).map((m) => m.category));
    return [...categories].map((category) => {
        const index = inputModels.findIndex(
            (inputModel) => availableModels.find((m) => m.modelId === inputModel.modelId)?.category === category
        );
        return { category, index: index === -1 ? undefined : index };
    });
}

export function modelChainLabel(inputModels: ModelInput["models"]): string {
    return inputModels.map((m) => m.modelId).join(" → ") || "Unknown model";
}

export function gridModelLabel(result: GridSimulationResult): string {
    return modelChainLabel(result.simulations[0]?.input.models ?? []);
}

export function phaseLabel(kind: string): string {
    return kind === "aqueous" ? "Aqueous" : "CO2-rich";
}

export function phaseUnit(kind: string): string {
    return kind === "aqueous" ? "wt%" : "ppm·mol";
}
