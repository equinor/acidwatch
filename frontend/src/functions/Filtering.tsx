import { ExperimentResult } from "../dto/ExperimentResult";
import { ModelConfig } from "../dto/FormConfig";

export const filterValidModels = (experiment: ExperimentResult, models: ModelConfig[]) => {
    const filteredConcs = Object.fromEntries(
        Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
    );
    return models
        .filter((model) => model.category === "Primary")
        .filter((model) => Object.entries(filteredConcs).every(([key]) => model.validSubstances.includes(key)));
};
