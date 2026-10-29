import type { ReactNode } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { AccordionItem } from "@/components/StageAccordionLayout";
import { buildStageSections } from "@/utils/modelUtils";

export function buildStageAccordionItems(
    chains: ModelInput["models"][],
    availableModels: ModelConfig[],
    renderContent: (indexPerChain: (number | undefined)[]) => ReactNode
): AccordionItem[] {
    const sectionsPerChain = chains.map((chain) => buildStageSections(chain, availableModels));
    return (sectionsPerChain[0] ?? []).flatMap(({ category }, position) => {
        const indexPerChain = sectionsPerChain.map((sections) => sections[position].index);
        return indexPerChain.some((index) => index !== undefined)
            ? [{ key: category, header: category, content: renderContent(indexPerChain) }]
            : [];
    });
}
