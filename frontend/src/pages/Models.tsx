import React, { useState, useEffect} from "react";
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
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";

const Models: React.FC = () => {
    const [concentrations, setConcentration] = useState<Record<string, number>>({});
    const [currentPrimaryModel, setCurrentPrimaryModel] = useState<ModelConfig | undefined>(undefined);
    const [currentSecondaryModel, setCurrentSecondaryModel] = useState<ModelConfig | undefined>(undefined);
    //const [currentSelectedModels, setCurrentSelectedModels] = useState<ModelConfig[] | undefined>(undefined);
    const { models } = useAvailableModels();
    const { simulationId } = useParams<{ simulationId?: string }>();
    const navigate = useNavigate();

    const { mutate: setModelInput } = useMutation({
        mutationFn: startSimulation,
        onSuccess: (data, simulationInput) => {
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: simulationInput.models.map((m) => m.modelId).join(", "),
            });
            navigate(`/simulations/${data}`);
        },
    });

    const { data: simulationResults, isLoading: isResultLoading } = useQuery({
        queryKey: ["simulation", simulationId],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });


    useEffect(() => {
        if (simulationId && !isResultLoading) {
            simulationHistory.finalizeEntry(simulationId);
        }
    }, [simulationId, isResultLoading]);

    useEffect(() => {
        if (simulationResults && models.length > 0) {
            
            const modelIds: string[] = simulationResults.input.models.map(m => m.modelId); 
            const matchedModels: ModelConfig[] = models.filter(model => modelIds.includes(model.modelId));  
            matchedModels.forEach(model => {
                if (model) {
                    if (model.category === "Primary") {
                        setCurrentPrimaryModel(model);
                        getModelInputStore(model).getState().reset(simulationResults?.input.models.find(m => m.modelId === model.modelId));
                    } else if (model.category === "Secondary") {
                        setCurrentSecondaryModel(model);
                        getModelInputStore(model).getState().reset(simulationResults?.input.models.find(m => m.modelId === model.modelId));
                    }
                }
            });
        }
    }, [simulationResults, models]);

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
                concentrations={concentrations}
                setConcentration={(name: string, value: number) => {
                    setConcentration(prev => ({ ...prev, [name]: value }));
                }}
            />
            <Step step={3} title="Results" />
            <ResultStep simulationResults={simulationResults} isLoading={isResultLoading} />
                <div style={{ height: "25dvh" }} />
            </MainContainer>
        );
};

export default Models;
