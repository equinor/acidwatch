import { ReactNode, useState } from "react";
import React from "react";
import ModelSelect from "@/components/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import ModelInputs from "@/components/ModelInputs";
import Results from "./Results";
import { useAvailableModels } from "@/contexts/ModelContext";
import SaveResult from "@/components/SaveResult";
import { SimulationResults } from "@/dto/SimulationResults";
import NoResults from "@/components/Simulation/NoResults.tsx";
import Working from "@/components/Simulation/Working.tsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, startSimulation } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import CenteredImage from "@/components/CenteredImage";
import noModelImage from "@/assets/no-model-light.svg";

const Models: React.FC = () => {
    const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
    const { models } = useAvailableModels();

    const { data: simulationId, mutate: setModelInput } = useMutation({
        mutationFn: startSimulation,
    });

    const { data: simulationResults, isLoading } = useQuery({
        queryKey: ["simulation", startSimulation],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
    });

    let inputsStep: ReactNode | null = null;
    if (currentModel === undefined) {
        inputsStep = <CenteredImage src={noModelImage} caption="No model selected" />;
    } else {
        inputsStep = models.map((model) => (
            <ModelInputs
                key={model.modelId}
                model={model}
                visible={model.modelId === currentModel?.modelId}
                onSubmit={(concentrations, parameters) =>
                    setModelInput({ modelId: model.modelId, concentrations, parameters })
                }
            />
        ));
    }

    let resultsStep: ReactNode | null = null;
    if (isLoading) {
        resultsStep = <Working />;
    } else if (simulationResults === undefined) {
        resultsStep = <NoResults />;
    } else {
        resultsStep = <Results simulationResults={simulationResults} />;
    }

    return (
        <MainContainer>
            <Step step={1} title="Models" description="Select a model for the simulation" />
            <ModelSelect currentModel={currentModel} setCurrentModel={setCurrentModel} />
            {/* For simplicity we create an input component per model, and show/hide on selection.
                    This makes statemanagement easier within the ModelInput, as we need to take care of quite
                    a bit of state. Otherwise it would have to all been stored in some context provider on top level.*/}
            <Step step={2} title="Inputs" />
            {inputsStep}
            <Step step={3} title="Results" />
            {resultsStep}
            {simulationResults && (
                <>
                    <SaveResult
                        props={{
                            parameters: simulationResults.modelInput.parameters || {},
                            selectedModel: currentModel?.displayName || "",
                            result: simulationResults ?? ({} as SimulationResults),
                        }}
                    />
                </>
            )}
            {/* Padding (25% of the device height) */}
            <div style={{ height: "25dvh" }}></div>
        </MainContainer>
    );
};

export default Models;
