import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";

type InputStepProps = {
    currentPrimaryModel?: ModelConfig;
    currentSecondaryModel?: ModelConfig;
    setModelInput: (modelInput: any) => void;
};

const InputStep: React.FC<InputStepProps> = ({ currentPrimaryModel, currentSecondaryModel, setModelInput }) => {
    const selectedModel = currentPrimaryModel || currentSecondaryModel;

    if (selectedModel !== undefined) {
        return <ModelInputs model={selectedModel} onSubmit={setModelInput} />;
    } else {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }
};

export default InputStep;
