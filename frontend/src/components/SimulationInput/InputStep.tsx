import { ModelConfig } from "@/dto/FormConfig";
import React from "react";
import ModelInputs from "@/components/SimulationInput/ModelInputs";
import noModelImage from "@/assets/no-model-light.svg";
import CenteredImage from "@/components/CenteredImage";
import { CreateGridSimulation } from "@/dto/GridSimulation";

type InputStepProps = {
    selectedModels: ModelConfig[];
    onSubmitSimulation: (modelInput: any) => void;
    onSubmitGridSimulation: (grid: CreateGridSimulation) => void;
    isSubmitting: boolean;
};

const InputStep: React.FC<InputStepProps> = ({
    selectedModels,
    onSubmitSimulation,
    onSubmitGridSimulation,
    isSubmitting,
}) => {
    if (selectedModels.length === 0) {
        return <CenteredImage src={noModelImage} caption="No model selected" />;
    }

    return (
        <ModelInputs
            selectedModels={selectedModels}
            onSubmitSimulation={onSubmitSimulation}
            onSubmitGridSimulation={onSubmitGridSimulation}
            isSubmitting={isSubmitting}
        />
    );
};

export default InputStep;
