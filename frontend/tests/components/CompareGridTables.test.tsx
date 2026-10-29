import { ComponentProps } from "react";
import { it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelConfig } from "@/dto/FormConfig";
import { GridSimulationResult } from "@/dto/GridSimulation";
import GenericTable from "@/components/Tables/GenericTable";

const { genericTable } = vi.hoisted(() => ({
    genericTable: vi.fn<(props: ComponentProps<typeof GenericTable>) => null>(() => null),
}));

vi.mock("@/api/api", () => ({ getGridSimulationResult: vi.fn() }));
vi.mock("@/contexts/ModelContext", () => ({ useAvailableModels: vi.fn() }));
vi.mock("@/components/Charts/LineChart", () => ({ default: () => null }));
vi.mock("@/components/Tables/GenericTable", () => ({ default: genericTable }));

import CompareGridSimulations from "@/components/Comparison/CompareGridSimulations";
import { getGridSimulationResult } from "@/api/api";
import { useAvailableModels } from "@/contexts/ModelContext";

const model: ModelConfig = {
    modelId: "chemical-model",
    category: "ChemicalEquilibrium",
    displayName: "Chemical model",
    accessError: null,
    validSubstances: ["CO2", "NO2"],
    parameters: {},
    descriptionHtml: "",
};

const grid = (values: number[]): GridSimulationResult => ({
    status: "done",
    axes: [{ substance: "CO2", range: { min: 100, max: 200, step: 100 } }],
    simulations: [100, 200].map((x, index) => ({
        status: "done",
        input: {
            concentrations: { CO2: x },
            conditions: { temperature: 300, pressure: 100 },
            models: [{ modelId: model.modelId, parameters: {} }],
        },
        results: [
            {
                phases: [{ kind: "co2-rich", fraction: 1, concentrations: { NO2: values[index] } }],
                panels: [],
            },
        ],
    })),
});

it("keeps both table columns when comparing grids using the same model", async () => {
    genericTable.mockClear();
    vi.mocked(useAvailableModels).mockReturnValue({ models: [model], error: null, isLoading: false });
    const grids: Record<string, GridSimulationResult> = {
        first: grid([1, 2]),
        second: grid([3, 4]),
    };
    vi.mocked(getGridSimulationResult).mockImplementation(async (id) => grids[id]);

    render(
        <QueryClientProvider client={new QueryClient()}>
            <CompareGridSimulations gridIds={["first", "second"]} />
        </QueryClientProvider>
    );

    await waitFor(() => {
        const rows = genericTable.mock.calls.at(-1)?.[0].data;
        expect(rows?.map((row) => Object.values(row))).toEqual([
            [100, "1.00", "3.00"],
            [200, "2.00", "4.00"],
        ]);
    });
});
