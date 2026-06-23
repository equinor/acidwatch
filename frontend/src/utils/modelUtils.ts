import { ModelConfig } from "@/dto/FormConfig";

export function sortModelsByCategory(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
        if (a.category === "ChemicalEquilibrium" && b.category === "PhaseEquilibrium") return -1;
        if (a.category === "PhaseEquilibrium" && b.category === "ChemicalEquilibrium") return 1;
        return 0;
    });
}
