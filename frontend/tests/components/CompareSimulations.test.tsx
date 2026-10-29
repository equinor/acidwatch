import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelConfig } from "@/dto/FormConfig";
import { SimulationResults } from "@/dto/SimulationResults";

const { barChart, concentrationTable } = vi.hoisted(() => ({
    barChart: vi.fn(() => null),
    concentrationTable: vi.fn(() => null),
}));

vi.mock("@/api/api", () => ({
    getResultForSimulation: vi.fn(),
    ResultIsPending: class extends Error {},
}));
vi.mock("@/contexts/ModelContext", () => ({ useAvailableModels: vi.fn() }));
vi.mock("@/components/Charts/BarChart", () => ({ default: barChart }));
vi.mock("@/components/Tables/ConcentrationTable", () => ({ default: concentrationTable }));

import CompareSimulations from "@/components/Comparison/CompareSimulations";
import { getResultForSimulation } from "@/api/api";
import { useAvailableModels } from "@/contexts/ModelContext";

const models = [
    { modelId: "chem-model", category: "ChemicalEquilibrium" },
    { modelId: "phase-model", category: "PhaseEquilibrium" },
] as ModelConfig[];

const simulation = (modelId: string, substance: string, value: number): SimulationResults => ({
    status: "done",
    input: {
        concentrations: { CO2: 100 },
        conditions: { temperature: 300, pressure: 100 },
        models: [{ modelId, parameters: {} }],
    },
    results: [{ phases: [{ kind: "co2-rich", fraction: 1, concentrations: { [substance]: value } }], panels: [] }],
});

const results: Record<string, SimulationResults> = {
    "chem-run-id": simulation("chem-model", "NO2", 5),
    "phase-run-id": simulation("phase-model", "HNO3", 7),
};

describe("CompareSimulations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAvailableModels).mockReturnValue({ models, error: null, isLoading: false });
        vi.mocked(getResultForSimulation).mockImplementation(async (id) => results[id]);
    });

    it("compares a chemical-only run with a phase-only run", async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <CompareSimulations simulationIds={["chem-run-id", "phase-run-id"]} />
            </QueryClientProvider>
        );

        await vi.waitFor(() => expect(barChart).toHaveBeenCalledTimes(2));

        const graphData = barChart.mock.calls.map(([props]) => (props as any).graphData);
        expect(graphData).toEqual([
            [{ label: "chem-model (chem-run)", data: [{ x: "NO2", y: 5 }] }],
            [{ label: "phase-model (phase-ru)", data: [{ x: "HNO3", y: 7 }] }],
        ]);

        const outputTables = concentrationTable.mock.calls
            .map(([props]) => props as any)
            .filter((props) => !props.highlightDifferences);
        expect(outputTables).toEqual([
            {
                substances: ["NO2"],
                simulations: [{ id: "chem-run-id", modelName: "chem-model", concentrations: { NO2: 5 } }],
            },
            {
                substances: ["HNO3"],
                simulations: [{ id: "phase-run-id", modelName: "phase-model", concentrations: { HNO3: 7 } }],
            },
        ]);
    });
});
