import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";
import { CreateSweep } from "@/dto/Sweep";

type InputStepProps = {
    selectedModels: ModelConfig[];
    setModelInput: (modelInput: any) => void;
    runSweep: (sweep: CreateSweep) => void;
};

const InputStep: React.FC<InputStepProps> = ({ selectedModels, setModelInput, runSweep }) => {
    if (selectedModels.length === 0) {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }

    return <ModelInputs selectedModels={selectedModels} onSubmit={setModelInput} onRunSweep={runSweep} />;
};

export default InputStep;
