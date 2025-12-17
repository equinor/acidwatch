import React, { ReactNode, useState, useEffect } from "react";
import ModelSelect from "@/components/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import ModelInputs from "@/components/ModelInputs";
import Results from "@/components/Results";
import { useAvailableModels } from "@/contexts/ModelContext";
import NoResults from "@/components/Simulation/NoResults";
import Working from "@/components/Simulation/Working";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending, startSimulation } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import CenteredImage from "@/components/CenteredImage";
import noModelImage from "@/assets/no-model-light.svg";
import { useNavigate, useParams } from "react-router-dom";
import DownloadButton from "@/components/DownloadButton";
import { convertSimulationQueriesResultToTabulatedData, convertTabulatedDataToCSVFormat } from "@/functions/Formatting";
import { simulationHistory } from "@/hooks/useSimulationHistory.ts";
import { getModelInputStore } from "@/hooks/useModelInputStore";

const Models: React.FC = () => {
    const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
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
            const model = models.find((model) => model.modelId === simulationResults.modelInput.modelId);

            if (model) {
                setCurrentModel(model);
                getModelInputStore(model).getState().reset(simulationResults.modelInput);
            } else {
                console.log(`Could not find model ${simulationResults.modelInput.modelId}`);
            }
        }
    }, [simulationResults, models]);

    let inputsStep: ReactNode | null = null;

    if (currentModel === undefined) {
        inputsStep = <CenteredImage src={noModelImage} caption="No model selected" />;
    } else {
        inputsStep = <ModelInputs model={currentModel} onSubmit={setModelInput} />;
    }

    let resultsStep: ReactNode | null = null;
    if (isLoading) {
        resultsStep = <Working />;
    } else if (simulationResults === undefined) {
        resultsStep = <NoResults />;
    } else {
        resultsStep = (
            <>
                <Results simulationResults={simulationResults} />
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "1rem",
                        marginBottom: "2rem",
                    }}
                >
                    <DownloadButton
                        csvContent={convertTabulatedDataToCSVFormat([
                            ...convertSimulationQueriesResultToTabulatedData({
                                [`${simulationResults.modelInput.modelId}`]: [simulationResults],
                            }),
                        ])}
                        fileName={`AcidWatch-ModelResults-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`}
                        isLoading={isLoading}
                    />
                </div>
            </>
        );
    }

    return (
        <MainContainer>
            <Step step={1} title="Models" description="Select a model for the simulation" />
            <ModelSelect currentModel={currentModel} setCurrentModel={setCurrentModel} />
            <Step step={2} title="Inputs" />
            {inputsStep}
            <Step step={3} title="Results" />
            {resultsStep}
            {/* Padding (25% of the device height) */}
            <div style={{ height: "25dvh" }}></div>
        </MainContainer>
    );
};

export default Models;
