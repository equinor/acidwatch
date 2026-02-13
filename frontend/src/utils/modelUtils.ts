import { ModelConfig } from "@/dto/FormConfig";

/**
 * Sorts models in execution order: Primary models first, then Secondary models.
 * This ensures the correct chain execution order regardless of selection order.
 */
export function sortModelsByCategory(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
        if (a.category === "Primary" && b.category === "Secondary") return -1;
        if (a.category === "Secondary" && b.category === "Primary") return 1;
        return 0;
    });
}
