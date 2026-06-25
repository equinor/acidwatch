import React, { useState, useEffect } from "react";
import ModelSelect from "@/components/Simulation/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    getResultForSimulation,
    getGridSimulationResult,
    ResultIsPending,
    startSimulation,
    startGridSimulation,
} from "@/api/api";
import Step from "@/components/Step";
import { MainContainer } from "@/components/styles";
import { useNavigate, useParams } from "react-router-dom";
import { simulationHistory } from "@/hooks/useSimulationHistory.ts";
import { getModelInputStore } from "@/hooks/useModelInputStore";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { useGridRangeStore } from "@/hooks/useGridRangeStore";
import InputStep from "@/components/Simulation/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";
import GridResultStep from "@/components/GridSimulation/GridResultStep";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";

const Models: React.FC = () => {
    const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
    const { models } = useAvailableModels();
    const { simulationId, gridId } = useParams<{ simulationId?: string; gridId?: string }>();
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
        mutate: runGrid,
        error: startGridError,
        reset: resetStartGridError,
    } = useMutation({
        mutationFn: startGridSimulation,
        onSuccess: (data, grid) => {
            const chain = displayNameForModels(grid.models.map((m) => m.modelId));
            const axisLabel = grid.axes.map((a) => a.substance).join(" × ");
            simulationHistory.addEntry({
                id: data,
                createdAt: new Date(),
                displayName: `${chain} · grid ${axisLabel}`,
                kind: "grid",
            });
            navigate(`/grid-simulations/${data}`);
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
        data: gridResult,
        isLoading: gridIsLoading,
        error: gridResultError,
    } = useQuery({
        queryKey: ["grid-simulation", gridId],
        queryFn: () => getGridSimulationResult(gridId!),
        enabled: gridId !== undefined,
        retry: (_count, error) => error instanceof ResultIsPending,
        retryDelay: () => 2000,
    });

    useEffect(() => {
        if (simulationId || gridId) {
            resetStartError();
            resetStartGridError();
        }
    }, [simulationId, gridId, resetStartError, resetStartGridError]);

    useEffect(() => {
        if (simulationId && !simulationIsLoading) {
            simulationHistory.finalizeEntry(simulationId);
        }
    }, [simulationId, simulationIsLoading]);

    useEffect(() => {
        if (gridId && !gridIsLoading) {
            simulationHistory.finalizeEntry(gridId);
        }
    }, [gridId, gridIsLoading]);

    useEffect(() => {
        if (simulationResults && simulationResults.status !== "error" && models.length > 0) {
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
        if (gridResult && models.length > 0) {
            const firstSim = gridResult.simulations[0];
            if (!firstSim) return;

            const loadedModels: ModelConfig[] = [];

            firstSim.input.models.forEach((modelInput) => {
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

            useConcentrationsStore.getState().reset(firstSim.input.concentrations);
            useConditionsStore.getState().reset(firstSim.input.conditions);

            useGridRangeStore.getState().reset({
                axes: gridResult.axes,
            });

            setSelectedModels(loadedModels);
        }
    }, [gridResult, models]);

    const isGridMode = gridId !== undefined;

    return (
        <MainContainer>
            <ErrorBoundary>
                <Step
                    step={1}
                    title="Models"
                    description="Select models for simulation. Multiple models can be chained together in a pipeline."
                />
                <ModelSelect selectedModels={selectedModels} setSelectedModels={setSelectedModels} />
                <Step step={2} title="Inputs" />
                <InputStep selectedModels={selectedModels} setModelInput={setModelInput} runGridSimulation={runGrid} />
                <Step step={3} title="Results" />
                {isGridMode ? (
                    <GridResultStep
                        result={gridResult}
                        isLoading={gridIsLoading}
                        error={gridResultError ?? startGridError}
                    />
                ) : (
                    <ResultStep
                        simulationResults={simulationResults}
                        isLoading={simulationIsLoading}
                        error={resultError ?? startError}
                    />
                )}
                <div style={{ height: "25dvh" }} />
            </ErrorBoundary>
        </MainContainer>
    );
};

export default Models;
