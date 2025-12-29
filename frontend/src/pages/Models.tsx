import React, { useState, useEffect } from "react";
import ModelSelect from "@/components/Simulation/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending, startSimulation } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import { useNavigate, useParams } from "react-router-dom";
import { simulationHistory } from "@/hooks/useSimulationHistory.ts";
import { getModelInputStore } from "@/hooks/useModelInputStore";
import { useSecondaryModelQuery } from "@/hooks/useSecondaryModelQuery";
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";

const Models: React.FC = () => {
    const [currentPrimaryModel, setCurrentPrimaryModel] = useState<ModelConfig | undefined>(undefined);
    const [currentSecondaryModel, setCurrentSecondaryModel] = useState<ModelConfig | undefined>(undefined);
    const { models } = useAvailableModels();
    const { simulationId } = useParams<{ simulationId?: string }>();
    const navigate = useNavigate();

    const { mutate: setModelInput } = useMutation({
        mutationFn: startSimulation,
        onSuccess: (data, model) => {
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: models.find((m) => m.modelId === model.modelId)?.displayName ?? model.modelId,
            });
            navigate(`/simulations/${data}`);
        },
    });

    const { data, isLoading: isPrimaryLoading } = useQuery({
        queryKey: ["simulation", simulationId],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    let simulationResults = data;

    useEffect(() => {
        if (simulationId && !isPrimaryLoading) {
            simulationHistory.finalizeEntry(simulationId);
        }
    }, [simulationId, isPrimaryLoading]);

    useEffect(() => {
        if (simulationResults && models.length > 0) {
            const model = models.find((model) => model.modelId === simulationResults?.modelInput.modelId);

            if (model) {
                if (model.category === "Primary") {
                    setCurrentPrimaryModel(model);
                    getModelInputStore(model).getState().reset(simulationResults.modelInput);
                } else if (model.category === "Secondary") {
                    setCurrentSecondaryModel(model);
                    getModelInputStore(model).getState().reset(simulationResults.modelInput);
                }
            } else {
                console.log(`Could not find model ${simulationResults.modelInput.modelId}`);
            }
        }
    }, [simulationResults, models]);

    const secondaryModelResults = useSecondaryModelQuery({
        primaryResults: simulationResults,
        secondaryModel: currentSecondaryModel,
        enabled:
            simulationResults !== undefined && currentSecondaryModel !== undefined && currentPrimaryModel !== undefined,
    });

    if (secondaryModelResults.hasSecondaryResults) {
        simulationResults = {
            ...simulationResults,
            status: simulationResults?.status ?? "done",
            modelInput: simulationResults?.modelInput ?? { concentrations: {}, parameters: {}, modelId: "" },
            finalConcentrations: simulationResults?.finalConcentrations ?? {},
            panels: [...(simulationResults?.panels ?? []), ...(secondaryModelResults.secondaryResults?.panels ?? [])],
        };
    }

    const isLoading = isPrimaryLoading || secondaryModelResults.isSecondaryLoading;
    return (
        <MainContainer>
            <Step
                step={1}
                title="Models"
                description="Select a model for simulation. Models can be run in a pipeline by selecting both primary and secondary."
            />
            <ModelSelect
                currentPrimaryModel={currentPrimaryModel}
                setCurrentPrimaryModel={setCurrentPrimaryModel}
                currentSecondaryModel={currentSecondaryModel}
                setCurrentSecondaryModel={setCurrentSecondaryModel}
            />
            <Step step={2} title="Inputs" />
            <InputStep
                currentPrimaryModel={currentPrimaryModel}
                currentSecondaryModel={currentSecondaryModel}
                setModelInput={setModelInput}
            />
            <Step step={3} title="Results" />
            <ResultStep simulationResults={simulationResults} isLoading={isLoading} />
            <div style={{ height: "25dvh" }} />
        </MainContainer>
    );
};

export default Models;
