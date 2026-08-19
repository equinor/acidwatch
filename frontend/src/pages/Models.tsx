import React, { useState, useEffect } from "react";
import ModelSelect from "@/components/SimulationInput/ModelSelect";
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
import InputStep from "@/components/SimulationInput/InputStep";
import ResultStep from "@/components/Simulation/ResultStep";
import GridResultStep from "@/components/GridSimulation/GridResultStep";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import { useRestoreSimulationInput } from "@/hooks/useRestoreSimulationInput";

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
        refetchInterval: (query) =>
            query.state.data?.status === "pending" || query.state.data?.status === "processing" ? 2000 : false,
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
        if (gridId && (gridResult?.status === "done" || gridResultError)) {
            simulationHistory.finalizeEntry(gridId);
        }
    }, [gridId, gridResult?.status, gridResultError]);

    const gridInput = gridResult?.simulations[0]?.input;
    const simulationInput = simulationResults?.status === "error" ? undefined : simulationResults?.input;
    useRestoreSimulationInput(gridInput ?? simulationInput, gridResult?.axes, models, setSelectedModels);

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
