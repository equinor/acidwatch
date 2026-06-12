import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";
import { CreateGridSimulation } from "@/dto/GridSimulation";

type InputStepProps = {
    selectedModels: ModelConfig[];
    setModelInput: (modelInput: any) => void;
    runGridSimulation: (grid: CreateGridSimulation) => void;
};

const InputStep: React.FC<InputStepProps> = ({ selectedModels, setModelInput, runGridSimulation }) => {
    if (selectedModels.length === 0) {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }

    return <ModelInputs selectedModels={selectedModels} onSubmit={setModelInput} onRunGrid={runGridSimulation} />;
};

export default InputStep;
