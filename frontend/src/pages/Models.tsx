import { ReactNode, useState, useEffect } from "react";
import React from "react";
import ModelSelect from "@/components/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import ModelInputs from "@/components/ModelInputs";
import Results from "../components/Results";
import { useAvailableModels } from "@/contexts/ModelContext";
import NoResults from "@/components/Simulation/NoResults";
import Working from "@/components/Simulation/Working";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, ResultIsPending, startSimulation } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import CenteredImage from "@/components/CenteredImage";
import noModelImage from "@/assets/no-model-light.svg";
import { useNavigate, useParams, useNavigationType } from "react-router-dom";
import DownloadButton from "@/components/DownloadButton";
import { convertSimulationQueriesResultToTabulatedData, convertTabulatedDataToCSVFormat } from "@/functions/Formatting";

const Models: React.FC = () => {
    const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
    const { models } = useAvailableModels();
    const { simulationId } = useParams<{ simulationId?: string }>();
    const navigate = useNavigate();
    const navigationType = useNavigationType();

    useEffect(() => {
        if (navigationType === "POP" && simulationId && sessionStorage.getItem("lastReloadId") !== simulationId) {
            sessionStorage.setItem("lastReloadId", simulationId);
            window.location.reload();
        }
    }, [simulationId, navigationType]);

    const { mutate: setModelInput } = useMutation({
        mutationFn: startSimulation,
        onSuccess: (data) => navigate(`/simulations/${data}`),
    });

    const { data: simulationResults, isLoading } = useQuery({
        queryKey: ["simulation", simulationId],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    useEffect(() => {
        if (simulationResults) {
            const usemodel = models.find((model) => model.modelId === simulationResults.modelInput.modelId);
            setCurrentModel(usemodel);
        }
    }, [simulationResults, models]);

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
                defaultConcentrations={
                    model.modelId === currentModel.modelId ? simulationResults?.modelInput?.concentrations : undefined
                }
                defaultParameters={
                    model.modelId === currentModel.modelId ? simulationResults?.modelInput?.parameters : undefined
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
            {/* For simplicity we create an input component per model, and show/hide on selection.
                    This makes statemanagement easier within the ModelInput, as we need to take care of quite
                    a bit of state. Otherwise it would have to all been stored in some context provider on top level.*/}
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
