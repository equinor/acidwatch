import { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelConfig } from "@/dto/FormConfig";
import { GridSimulationResult } from "@/dto/GridSimulation";
import { LineChartProps } from "@/components/Charts/LineChart";
import GenericTable from "@/components/Tables/GenericTable";

const { lineChart, genericTable } = vi.hoisted(() => ({
    lineChart: vi.fn<(props: LineChartProps) => null>(() => null),
    genericTable: vi.fn<(props: ComponentProps<typeof GenericTable>) => null>(() => null),
}));

vi.mock("@/api/api", () => ({ getGridSimulationResult: vi.fn() }));
vi.mock("@/contexts/ModelContext", () => ({ useAvailableModels: vi.fn() }));
vi.mock("@/components/Charts/LineChart", () => ({ default: lineChart }));
vi.mock("@/components/Tables/GenericTable", () => ({ default: genericTable }));

import CompareGridSimulations from "@/components/Comparison/CompareGridSimulations";
import { getGridSimulationResult } from "@/api/api";
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

const grid = (chain: string[], outputs: number[][]): GridSimulationResult => ({
    status: "done",
    axes: [{ substance: "CO2", range: { min: 100, max: 200, step: 100 } }],
    simulations: [100, 200].map((x, index) => ({
        status: "done",
        input: {
            concentrations: { CO2: x },
            conditions: { temperature: 300, pressure: 100 },
            models: chain.map((modelId) => ({ modelId, parameters: {} })),
        },
        results: outputs.map((values) => ({
            phases: [{ kind: "co2-rich", fraction: 1, concentrations: { NO2: values[index] } }],
            panels: [],
        })),
    })),
});

const grids: Record<string, GridSimulationResult> = {
    chemical: grid(["chemical"], [[1, 2]]),
    phase: grid(["phase"], [[3, 4]]),
    mixed: grid(
        ["chemical", "phase"],
        [
            [5, 6],
            [7, 8],
        ]
    ),
};

describe("CompareGridSimulations stage alignment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAvailableModels).mockReturnValue({ models, error: null, isLoading: false });
        vi.mocked(getGridSimulationResult).mockImplementation(async (id) => grids[id]);
    });

    it.each([
        { ids: ["chemical", "phase"], expected: [[[1, 2]], [[3, 4]]] },
        {
            ids: ["phase", "mixed"],
            expected: [
                [[5, 6]],
                [
                    [3, 4],
                    [7, 8],
                ],
            ],
        },
        {
            ids: ["mixed", "phase"],
            expected: [
                [[5, 6]],
                [
                    [7, 8],
                    [3, 4],
                ],
            ],
        },
    ])("aligns chart and table data for $ids", async ({ ids, expected }) => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <CompareGridSimulations gridIds={ids} />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(lineChart.mock.calls.map(([props]) => props.series.map((series) => series.data))).toEqual(expected);
        });

        const tables = genericTable.mock.calls.map(([props]) =>
            Object.keys(props.data[0])
                .slice(1)
                .map((label) => props.data.map((row) => Number(row[label])))
        );
        expect(tables).toEqual(expected);
        expect(lineChart.mock.calls.map(([props]) => props.xValues)).toEqual([
            [100, 200],
            [100, 200],
        ]);
    });
});
