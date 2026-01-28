import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "./ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";

type InputStepProps = {
    currentPrimaryModel?: ModelConfig;
    currentSecondaryModel?: ModelConfig;
    setModelInput: (modelInput: any) => void;
    concentrations: Record<string, number>;
    setConcentration: (name: string, value: number) => void;
};

const InputStep: React.FC<InputStepProps> = ({ currentPrimaryModel, currentSecondaryModel, setModelInput, concentrations, setConcentration }) => {
    const selectedModel = currentPrimaryModel || currentSecondaryModel;

    const isChainSimulation = currentPrimaryModel !== undefined && currentSecondaryModel !== undefined;

    if (selectedModel !== undefined) {
        if (isChainSimulation) {
            return (
                <ModelInputs model={selectedModel} secondaryModel={currentSecondaryModel} onSubmit={setModelInput} concentrations={concentrations} setConcentration={setConcentration} />
            );
        } else {
            return <ModelInputs model={selectedModel} onSubmit={setModelInput} concentrations={concentrations} setConcentration={setConcentration} />;
        }
    } else {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }
};

export default InputStep;
