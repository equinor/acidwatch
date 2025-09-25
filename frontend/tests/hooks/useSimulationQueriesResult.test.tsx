import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExperimentResult } from "../../src/dto/ExperimentResult";
import { ModelConfig } from "../../src/dto/FormConfig";
import React from "react";

const mockExperiments: ExperimentResult[] = [
    {
        name: "Experiment 1",
        time: 100,
        temperature: 25,
        pressure: 1,
        initialConcentrations: { CO2: 0.5, H2O: 0.3 },
        finalConcentrations: { CO2: 0.4, H2O: 0.4 },
    },
    {
        name: "Experiment 2",
        time: 200,
        temperature: 30,
        pressure: 1.2,
        initialConcentrations: { CO2: 0.6, H2O: 0.2, CH4: 0.1 },
        finalConcentrations: { CO2: 0.3, H2O: 0.5 },
    },
];

const mockModels: ModelConfig[] = [
    {
        modelId: "model1",
        displayName: "Primary Model 1",
        validSubstances: ["CO2", "H2O"],
        parameters: { Temperature: { default: 300 }, Pressure: { default: 1 } },
        description: "Test model",
        category: "Primary",
    },
    {
        modelId: "model2",
        displayName: "Primary Model 2",
        validSubstances: ["CO2", "H2O", "CH4"],
        parameters: {},
        description: "Test model",
        category: "Primary",
    },
];

const mockSimulationResult = {
    modelInput: {
        concentrations: { CO2: 0.5, H2O: 0.3 },
        parameters: { Temperature: 300, Pressure: 1 },
        modelId: "model1",
    },
    finalConcentrations: { CO2: 0.45, H2O: 0.35 },
    panels: [],
};

vi.mock("../../src/api/api", () => ({
    runSimulation: vi.fn(),
}));

vi.mock("../../src/contexts/ModelContext", () => ({
    useAvailableModels: vi.fn(),
}));

import { useSimulationQueries } from "../../src/hooks/useSimulationQueriesResult";
import { runSimulation } from "../../src/api/api";
import { useAvailableModels } from "../../src/contexts/ModelContext";

describe("useSimulationQueries Hook", () => {
    let queryClient: QueryClient;

    const createWrapper = () => {
        return ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    };

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: 0,
                },
            },
        });

        vi.clearAllMocks();

        vi.mocked(useAvailableModels).mockReturnValue({
            models: mockModels,
            error: null,
            isLoading: false,
        });
        vi.mocked(runSimulation).mockResolvedValue(mockSimulationResult);
    });

    it("test custom hook", async () => {
        const { result } = renderHook(() => useSimulationQueries(mockExperiments), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(vi.mocked(runSimulation).mock.calls).toHaveLength(3);

        console.log("Hook output:", result.current.isLoading, result.current.data, result.current.experiments);
    });
});
