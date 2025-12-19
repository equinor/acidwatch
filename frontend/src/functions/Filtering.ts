import { ExperimentResult } from "@/dto/ExperimentResult";
import { ModelConfig } from "@/dto/FormConfig";

export const filterValidModels = (experiment: ExperimentResult, models: ModelConfig[]) => {
    const filteredConcs = Object.fromEntries(
        Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
    );
    return models
        .filter((model) => model.category === "Primary")
        .filter((model) => Object.entries(filteredConcs).every(([key]) => model.validSubstances.includes(key)));
};

export function getValidParametersForSecondaryModel(
    parameters: Record<string, any> | undefined,
    validParams: string[] | undefined
) {
    if (!parameters || !validParams) return {};
    return Object.fromEntries(Object.entries(parameters).filter(([key]) => validParams.includes(key)));
}

export function filterInValidAndUndefinedSubstances(
    concentrations: Record<string, number | undefined>,
    validSubstances?: string[]
): Record<string, number> {
    return Object.entries(concentrations)
        .filter(
            ([substance, concentration]) =>
                !!validSubstances?.includes(substance) && concentration !== undefined && Number(concentration) > 0
        )
        .reduce(
            (acc, [substance, concentration]) => ({
                ...acc,
                [substance]: Number(concentration),
            }),
            {} as Record<string, number>
        );
}
/* Specific for Solubility CCS model - added after consultation with domain experts*/
export function filterAcidWithLowConcentration(concentrations: Record<string, number>): Record<string, number> {
    const acids = ["HNO3", "H2SO4"];
    const presentAcids = acids.filter((acid) => concentrations[acid] !== undefined);
    const updatedConcentrations = { ...concentrations };
    if (presentAcids.length === 2) {
        const [acid1, acid2] = presentAcids;
        if (concentrations[acid1] >= concentrations[acid2]) {
            delete updatedConcentrations[acid2];
        } else {
            delete updatedConcentrations[acid1];
        }
    }
    return updatedConcentrations;
}
