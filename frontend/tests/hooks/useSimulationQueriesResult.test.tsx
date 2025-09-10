import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExperimentResult } from "../../src/dto/ExperimentResult";
import { ModelConfig } from "../../src/dto/FormConfig";
import { ChartDataSet } from "../../src/dto/ChartData";
import React from "react";

// Mock data
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
        initialConcentrations: { CO2: 0.6, H2O: 0.2 },
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
    initialConcentrations: { CO2: 0.5, H2O: 0.3 },
    finalConcentrations: { CO2: 0.45, H2O: 0.35 },
    panels: [],
};

const mockChartDataSet: ChartDataSet = {
    label: "Primary Model 1 (Experiment 1)",
    data: [
        { x: "CO2", y: 0.45 },
        { x: "H2O", y: 0.35 },
    ],
};

// Mock external dependencies using factory functions to avoid hoisting issues
vi.mock("../../src/api/api", () => ({
    runSimulation: vi.fn(),
}));

vi.mock("../../src/functions/Filtering", () => ({
    filterValidModels: vi.fn(),
}));

vi.mock("../../src/functions/Formatting", () => ({
    convertSimulationToChartData: vi.fn(),
}));

vi.mock("../../src/contexts/ModelContext", () => ({
    useAvailableModels: vi.fn(),
}));

import { useSimulationQueries } from "../../src/hooks/UseSimulationQueriesResult";
import { runSimulation } from "../../src/api/api";
import { filterValidModels } from "../../src/functions/Filtering";
import { convertSimulationToChartData } from "../../src/functions/Formatting";
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
        vi.mocked(filterValidModels).mockReturnValue(mockModels);
        vi.mocked(runSimulation).mockResolvedValue(mockSimulationResult);
        vi.mocked(convertSimulationToChartData).mockReturnValue(mockChartDataSet);
    });

    it("converts simulation results to chart data", async () => {
        const { result } = renderHook(() => useSimulationQueries(mockExperiments), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(convertSimulationToChartData).toHaveBeenCalled();
        });

        console.log("Hook output:", result.current.data);

        expect(convertSimulationToChartData).toHaveBeenCalledWith(
            mockSimulationResult,
            "Primary Model 1",
            "Experiment 1"
        );

        expect(convertSimulationToChartData).toHaveBeenCalledWith(
            mockSimulationResult,
            "Primary Model 1",
            "Experiment 2"
        );
    });
});
