import React, { useState, useEffect } from "react";
import ModelSelect from "@/components/Simulation/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getResultForSimulation, getSweepResult, ResultIsPending, startSimulation, startSweep } from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import { useNavigate, useParams } from "react-router-dom";
import { simulationHistory } from "@/hooks/useSimulationHistory.ts";
import { getModelInputStore } from "@/hooks/useModelInputStore";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { useSweepRangeStore } from "@/hooks/useSweepRangeStore";
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";
import SweepResultStep from "@/components/Sweep/SweepResultStep";

const Models: React.FC = () => {
    const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
    const { models } = useAvailableModels();
    const { simulationId, sweepId } = useParams<{ simulationId?: string; sweepId?: string }>();
    const navigate = useNavigate();

    const displayNameForModels = (modelIds: string[]): string =>
        modelIds.map((id) => models.find((mc) => mc.modelId === id)?.displayName ?? id).join(" → ");

    const {
        mutate: setModelInput,
        error: startError,
        reset: resetStartError,
    } = useMutation({
        mutationFn: startSimulation,
        onSuccess: (data, model) => {
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: displayNameForModels(model.models.map((m) => m.modelId)),
                kind: "simulation",
            });
            navigate(`/simulations/${data}`);
        },
    });

    const {
        mutate: runSweep,
        error: startSweepError,
        reset: resetStartSweepError,
    } = useMutation({
        mutationFn: startSweep,
        onSuccess: (data, sweep) => {
            const chain = displayNameForModels(sweep.models.map((m) => m.modelId));
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: `${chain} · sweep ${sweep.sweptSubstance}`,
                kind: "sweep",
            });
            navigate(`/sweeps/${data}`);
        },
    });

    const {
        data: simulationResults,
        isLoading: simulationIsLoading,
        error: resultError,
    } = useQuery({
        queryKey: ["simulation", simulationId],
        queryFn: () => getResultForSimulation(simulationId!),
        enabled: simulationId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    const {
        data: sweepResults,
        isLoading: sweepIsLoading,
        error: sweepResultError,
    } = useQuery({
        queryKey: ["sweep", sweepId],
        queryFn: () => getSweepResult(sweepId!),
        enabled: sweepId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    useEffect(() => {
        // Clear any previous start errors when navigating to a saved run.
        if (simulationId || sweepId) {
            resetStartError();
            resetStartSweepError();
        }
    }, [simulationId, sweepId, resetStartError, resetStartSweepError]);

    useEffect(() => {
        if (simulationId && !simulationIsLoading) {
            simulationHistory.finalizeEntry(simulationId);
        }
    }, [simulationId, simulationIsLoading]);

    useEffect(() => {
        if (sweepId && !sweepIsLoading) {
            simulationHistory.finalizeEntry(sweepId);
        }
    }, [sweepId, sweepIsLoading]);

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
            useConditionsStore.getState().reset(simulationResults.input.conditions);
            setSelectedModels(loadedModels);
        }
    }, [simulationResults, models]);

    useEffect(() => {
        if (sweepResults && models.length > 0) {
            const loadedModels: ModelConfig[] = [];

            sweepResults.models.forEach((modelInput) => {
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

            useConcentrationsStore.getState().reset(sweepResults.concentrations);
            useConditionsStore.getState().reset(sweepResults.conditions);

            const values = sweepResults.values;
            useSweepRangeStore.getState().reset({
                sweptSubstance: sweepResults.sweptSubstance,
                min: values[0],
                max: values[values.length - 1],
                steps: values.length,
            });

            setSelectedModels(loadedModels);
        }
    }, [sweepResults, models]);

    const isSweepMode = sweepId !== undefined;

    return (
        <MainContainer>
            <Step
                step={1}
                title="Models"
                description="Select models for simulation. Multiple models can be chained together in a pipeline."
            />
            <ModelSelect selectedModels={selectedModels} setSelectedModels={setSelectedModels} />
            <Step step={2} title="Inputs" />
            <InputStep selectedModels={selectedModels} setModelInput={setModelInput} runSweep={runSweep} />
            <Step step={3} title="Results" />
            {isSweepMode ? (
                <SweepResultStep
                    sweepResults={sweepResults}
                    isLoading={sweepIsLoading}
                    error={sweepResultError ?? startSweepError}
                />
            ) : (
                <ResultStep
                    simulationResults={simulationResults}
                    isLoading={simulationIsLoading}
                    error={resultError ?? startError}
                />
            )}
            <div style={{ height: "25dvh" }} />
        </MainContainer>
    );
};

export default Models;
