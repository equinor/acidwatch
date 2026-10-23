import type { ReactNode } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { ModelInput } from "@/dto/ModelInput";
import { Phase } from "@/dto/SimulationResults";
import { AccordionItem } from "@/components/ModelAccordionLayout";
import { buildModelSections, phaseLabel } from "@/utils/modelUtils";

export function buildPhaseAccordionItems(
    inputModels: ModelInput["models"],
    availableModels: ModelConfig[],
    phaseKindsFor: (modelIndex: number) => Phase["kind"][],
    renderContent: (modelIndex: number, phaseKind: Phase["kind"]) => ReactNode
): AccordionItem[] {
    return buildModelSections(inputModels, availableModels).flatMap((section) =>
        section.indices.flatMap((modelIndex) => {
            const phaseKinds = phaseKindsFor(modelIndex);
            const modelId = inputModels[modelIndex]?.modelId;
            const modelName = availableModels.find((m) => m.modelId === modelId)?.displayName ?? modelId;
            return phaseKinds.map((phaseKind) => ({
                key: `${section.category}-${modelIndex}-${phaseKind}`,
                header:
                    phaseKinds.length === 1
                        ? `${section.category}: ${modelName}`
                        : `${section.category}: ${modelName} — ${phaseLabel(phaseKind)}`,
                content: renderContent(modelIndex, phaseKind),
            }));
        })
    );
}
