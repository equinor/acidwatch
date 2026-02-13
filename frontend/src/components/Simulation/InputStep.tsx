import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";

type InputStepProps = {
    selectedModels: ModelConfig[];
    setModelInput: (modelInput: any) => void;
};

const InputStep: React.FC<InputStepProps> = ({ selectedModels, setModelInput }) => {
    if (selectedModels.length === 0) {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }

    return <ModelInputs selectedModels={selectedModels} onSubmit={setModelInput} />;
};

export default InputStep;
