import type { ReactNode } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { AccordionItem } from "@/components/StageAccordionLayout";
import { buildStageSections } from "@/utils/modelUtils";

export function buildStageAccordionItems(
    inputModels: ModelInput["models"],
    availableModels: ModelConfig[],
    renderContent: (modelIndex: number) => ReactNode
): AccordionItem[] {
    return buildStageSections(inputModels, availableModels).flatMap((section) =>
        section.indices.map((modelIndex) => ({
            key: `${section.category}-${modelIndex}`,
            header: section.category,
            content: renderContent(modelIndex),
        }))
    );
}
