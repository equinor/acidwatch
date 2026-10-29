import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelConfig } from "@/dto/FormConfig";
import { GridSimulationResult } from "@/dto/GridSimulation";

const { lineChart, seriesTable } = vi.hoisted(() => ({
    lineChart: vi.fn(() => null),
    seriesTable: vi.fn(() => null),
}));

vi.mock("@/api/api", () => ({ getGridSimulationResult: vi.fn() }));
vi.mock("@/contexts/ModelContext", () => ({ useAvailableModels: vi.fn() }));
vi.mock("@/components/Charts/LineChart", () => ({ default: lineChart }));
vi.mock("@/components/Tables/SeriesTable", () => ({ default: seriesTable }));

import CompareGridSimulations from "@/components/Comparison/CompareGridSimulations";
import { getGridSimulationResult } from "@/api/api";
import { useAvailableModels } from "@/contexts/ModelContext";

const models = [
    { modelId: "chem-model", category: "ChemicalEquilibrium" },
    { modelId: "phase-model", category: "PhaseEquilibrium" },
] as ModelConfig[];

const grid = (modelId: string, substance: string, values: number[]): GridSimulationResult => ({
    status: "done",
    axes: [{ substance: "CO2", range: { min: 100, max: 200, step: 100 } }],
    simulations: [100, 200].map((x, index) => ({
        status: "done",
        input: {
            concentrations: { CO2: x },
            conditions: { temperature: 300, pressure: 100 },
            models: [{ modelId, parameters: {} }],
        },
        results: [
            {
                phases: [{ kind: "co2-rich", fraction: 1, concentrations: { [substance]: values[index] } }],
                panels: [],
            },
        ],
    })),
});

const grids: Record<string, GridSimulationResult> = {
    "chem-grid": grid("chem-model", "NO2", [1, 2]),
    "phase-grid": grid("phase-model", "HNO3", [3, 4]),
};

describe("CompareGridSimulations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAvailableModels).mockReturnValue({ models, error: null, isLoading: false });
        vi.mocked(getGridSimulationResult).mockImplementation(async (id) => grids[id]);
    });

    it("compares a chemical-only grid with a phase-only grid", async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <CompareGridSimulations gridIds={["chem-grid", "phase-grid"]} />
            </QueryClientProvider>
        );

        await vi.waitFor(() => expect(lineChart).toHaveBeenCalledTimes(2));

        const charts = lineChart.mock.calls.map(([props]) => props as any);
        expect(charts.map(({ xValues, series }) => ({ xValues, series }))).toEqual([
            { xValues: [100, 200], series: [{ label: "NO2 (nitrogen dioxide)", data: [1, 2] }] },
            { xValues: [100, 200], series: [{ label: "HNO3 (nitric acid)", data: [3, 4] }] },
        ]);

        const tables = seriesTable.mock.calls.map(([props]) => props as any);
        expect(tables.map(({ series }) => series)).toEqual(charts.map(({ series }) => series));
    });
});
