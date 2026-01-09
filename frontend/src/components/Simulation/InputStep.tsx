import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";
import { ModelsByCategory } from "@/hooks/useModelSelection";

type InputStepProps = {
    selectedModels: ModelsByCategory;
    onSubmit: () => void;
};

const InputStep: React.FC<InputStepProps> = ({ selectedModels, onSubmit }) => {
    const modelArray = Object.values(selectedModels).filter((m) => m !== undefined);

    if (modelArray.length === 0) {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }

    return <ModelInputs models={modelArray} onSubmit={onSubmit} />;
};

export default InputStep;
