import type { ReactNode } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { AccordionItem } from "@/components/ModelAccordionLayout";
import { buildModelSections } from "@/utils/modelUtils";

export function buildModelAccordionItems(
    inputModels: ModelInput["models"],
    availableModels: ModelConfig[],
    renderContent: (modelIndex: number) => ReactNode
): AccordionItem[] {
    return buildModelSections(inputModels, availableModels).flatMap((section) =>
        section.indices.map((modelIndex) => ({
            key: `${section.category}-${modelIndex}`,
            header: section.category,
            content: renderContent(modelIndex),
        }))
    );
}
