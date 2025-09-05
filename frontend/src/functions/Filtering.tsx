import { ExperimentResult } from "../dto/ExperimentResult";
import { ModelConfig } from "../dto/FormConfig";
import { ScatterGraphData } from "../dto/ScatterGraphInput";

export const filterValidModels = (experiment: ExperimentResult, models: ModelConfig[]) => {
    const filteredConcs = Object.fromEntries(
        Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
    );
    return models
        .filter((model) => model.category === "Primary")
        .filter((model) => Object.entries(filteredConcs).every(([key]) => model.validSubstances.includes(key)));
};

export const filterGraphDataByComponents = (
    graphData: ScatterGraphData[],
    selectedComponents: string[]
): ScatterGraphData[] => {
    if (selectedComponents.length === 0) {
        return [];
    }
    return graphData.filter((dataPoint) => selectedComponents.includes(dataPoint.x as string));
};
