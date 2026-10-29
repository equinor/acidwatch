import { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelConfig } from "@/dto/FormConfig";
import { SimulationResults } from "@/dto/SimulationResults";
import { BarChartProps } from "@/components/Charts/BarChart";
import ConcentrationTable from "@/components/Tables/ConcentrationTable";

const { barChart, concentrationTable } = vi.hoisted(() => ({
    barChart: vi.fn<(props: BarChartProps) => null>(() => null),
    concentrationTable: vi.fn<(props: ComponentProps<typeof ConcentrationTable>) => null>(() => null),
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

const models: ModelConfig[] = [
    { modelId: "chemical", category: "ChemicalEquilibrium" as const },
    { modelId: "phase", category: "PhaseEquilibrium" as const },
].map((model) => ({
    ...model,
    displayName: model.modelId,
    accessError: null,
    validSubstances: ["CO2", "NO2"],
    parameters: {},
    descriptionHtml: "",
}));

const simulation = (chain: string[], outputs: number[]): SimulationResults => ({
    status: "done",
    input: {
        concentrations: { CO2: 100 },
        conditions: { temperature: 300, pressure: 100 },
        models: chain.map((modelId) => ({ modelId, parameters: {} })),
    },
    results: outputs.map((value) => ({
        phases: [{ kind: "co2-rich", fraction: 1, concentrations: { NO2: value } }],
        panels: [],
    })),
});

const results: Record<string, SimulationResults> = {
    chemical: simulation(["chemical"], [5]),
    phase: simulation(["phase"], [7]),
    mixed: simulation(["chemical", "phase"], [11, 13]),
};

describe("CompareSimulations stage alignment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAvailableModels).mockReturnValue({ models, error: null, isLoading: false });
        vi.mocked(getResultForSimulation).mockImplementation(async (id) => results[id]);
    });

    it.each([
        { ids: ["chemical", "phase"], expected: [[5], [7]] },
        { ids: ["phase", "mixed"], expected: [[11], [7, 13]] },
        { ids: ["mixed", "phase"], expected: [[11], [13, 7]] },
    ])("aligns chart and table data for $ids", async ({ ids, expected }) => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <CompareSimulations simulationIds={ids} />
            </QueryClientProvider>
        );

        await waitFor(() => {
            const charts = barChart.mock.calls.map(([props]) =>
                props.graphData.map((series) => series.data.map((point) => point.y))
            );
            expect(charts).toEqual(expected.map((values) => values.map((value) => [value])));
        });

        const tables = concentrationTable.mock.calls
            .map(([props]) => props)
            .filter((props) => !props.highlightDifferences);
        expect(tables.map((props) => props.simulations.map((sim) => sim.concentrations.NO2))).toEqual(expected);
    });
});
