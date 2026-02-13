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
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";

const Models: React.FC = () => {
    const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
    const { models } = useAvailableModels();
    const { simulationId } = useParams<{ simulationId?: string }>();
    const navigate = useNavigate();

    const { mutate: setModelInput } = useMutation({
        mutationFn: startSimulation,
        onSuccess: (data, model) => {
            const displayNames = model.models
                .map((m) => models.find((mc) => mc.modelId === m.modelId)?.displayName ?? m.modelId)
                .join(" → ");
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: displayNames,
            });
            navigate(`/simulations/${data}`);
        },
    });

    const { data: simulationResults, isLoading } = useQuery({
        queryKey: ["simulation", simulationId],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    useEffect(() => {
        if (simulationId && !isLoading) {
            simulationHistory.finalizeEntry(simulationId);
        }
    }, [simulationId, isLoading]);

    useEffect(() => {
        if (simulationResults && models.length > 0) {
            const loadedModels: ModelConfig[] = [];

            simulationResults.input.models.forEach((modelInput) => {
                const model = models.find((m) => m.modelId === modelInput.modelId);
                if (model) {
                    loadedModels.push(model);
                    getModelInputStore(model).getState().reset({
                        parameters: modelInput.parameters,
                    });
                } else {
                    console.log(`Could not find model ${modelInput.modelId}`);
                }
            });

            useConcentrationsStore.getState().reset(simulationResults.input.concentrations);
            setSelectedModels(loadedModels);
        }
    }, [simulationResults, models]);
    return (
        <MainContainer>
            <Step
                step={1}
                title="Models"
                description="Select models for simulation. Multiple models can be chained together in a pipeline."
            />
            <ModelSelect selectedModels={selectedModels} setSelectedModels={setSelectedModels} />
            <Step step={2} title="Inputs" />
            <InputStep selectedModels={selectedModels} setModelInput={setModelInput} />
            <Step step={3} title="Results" />
            <ResultStep simulationResults={simulationResults} isLoading={isLoading} />
            <div style={{ height: "25dvh" }} />
        </MainContainer>
    );
};

export default Models;
