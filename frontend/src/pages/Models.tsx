import React, { useState, useEffect } from "react";
import ModelSelect from "@/components/Simulation/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending, createSimulationChain } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import { useNavigate, useParams } from "react-router-dom";
import { simulationHistory } from "@/hooks/useSimulationHistory.ts";
import { getModelInputStore } from "@/hooks/useModelInputStore";
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";
import { useModelSelection } from "@/hooks/useModelSelection";

const Models: React.FC = () => {
    const { selectedModels, setModelForCategory, getSelectedModelsArray, setSelectedModels } = useModelSelection();
    const { models } = useAvailableModels();
    const { simulationId } = useParams<{ simulationId?: string }>();
    const navigate = useNavigate();

    const { mutate: runSimulations } = useMutation({
        mutationFn: async () => {
            const modelArray = getSelectedModelsArray();

            if (modelArray.length === 0) {
                throw new Error("No models selected");
            }

            const stages = modelArray.map((model, index) => ({
                modelId: model.modelId,
                concentrations: index === 0 ? getModelInputStore(model).getState().concentrations : {},
                parameters: getModelInputStore(model).getState().parameters,
            }));

            // Always use chain endpoint - backend handles single vs multi uniformly
            return await createSimulationChain(stages);
        },
        onSuccess: (data) => {
            const modelArray = getSelectedModelsArray();
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: modelArray.map((m) => m.displayName).join(" → "),
            });
            navigate(`/simulations/${data}`);
        },
    });

    const { data: chainedResults, isLoading } = useQuery({
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

    // Restore model selections from loaded chain results
    useEffect(() => {
        if (chainedResults && models.length > 0) {
            const newSelections: Record<string, ModelConfig> = {};

            chainedResults.stages.forEach((stage) => {
                const model = models.find((m) => m.modelId === stage.modelInput.modelId);
                if (model) {
                    newSelections[model.category] = model;
                    getModelInputStore(model).getState().reset(stage.modelInput);
                }
            });

            setSelectedModels(newSelections);
        }
    }, [chainedResults, models, setSelectedModels]);

    return (
        <MainContainer>
            <Step
                step={1}
                title="Models"
                description="Select a model for simulation. Models can be run in a pipeline by selecting multiple categories."
            />
            <ModelSelect selectedModels={selectedModels} setModelForCategory={setModelForCategory} />
            <Step step={2} title="Inputs" />
            <InputStep selectedModels={selectedModels} onSubmit={runSimulations} />
            <Step step={3} title="Results" />
            <ResultStep chainedResults={chainedResults} isLoading={isLoading} />
            <div style={{ height: "25dvh" }} />
        </MainContainer>
    );
};

export default Models;
