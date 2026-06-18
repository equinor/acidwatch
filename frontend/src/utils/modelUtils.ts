import { ModelConfig } from "@/dto/FormConfig";

export function sortModelsByCategory(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
        if (a.category === "Reactive" && b.category === "PhaseTransition") return -1;
        if (a.category === "PhaseTransition" && b.category === "Reactive") return 1;
        return 0;
    });
}
