import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import LabResultsPlot from "../../src/components/LabResultsPlot";
import { ExperimentResult } from "../../src/dto/ExperimentResult";
import { ChartDataSet } from "../../src/dto/ChartData";

vi.mock("../../src/components/BarChart", () => ({
    default: vi.fn(({ graphData, aspectRatio }) => (
        <div data-testid="bar-chart" data-graph-data={JSON.stringify(graphData)} data-aspect-ratio={aspectRatio}>
            BarChart with {graphData.length} datasets
        </div>
    )),
}));

describe("LabResultsPlot Component", () => {
    const mockExperiments: ExperimentResult[] = [
        {
            name: "Experiment 1",
            time: 100,
            temperature: 25,
            pressure: 1,
            initialConcentrations: { CO2: 0.5, H2O: 0.3 },
            finalConcentrations: { CO2: 0.4, H2O: 0.4, CH4: 0.1 },
        },
        {
            name: "Experiment 2",
            time: 200,
            temperature: 30,
            pressure: 1.2,
            initialConcentrations: { CO2: 0.6, H2O: 0.2 },
            finalConcentrations: { CO2: 0.3, H2O: 0.5, N2: 0.2 },
        },
    ];

    const mockSimulationQueries: ChartDataSet[] = [
        {
            label: "Model 1 - Experiment 1",
            data: [
                { x: "CO2", y: 0.35 },
                { x: "H2O", y: 0.45 },
                { x: "CH4", y: 0.15 },
            ],
        },
        {
            label: "Model 2 - Experiment 1",
            data: [
                { x: "CO2", y: 0.38 },
                { x: "H2O", y: 0.42 },
            ],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("passes correct data to BarChart component", () => {
        render(
            <LabResultsPlot
                selectedExperiments={mockExperiments}
                simulationQueries={mockSimulationQueries}
                isLoading={false}
            />
        );

        const barChart = screen.getByTestId("bar-chart");
        const graphData = JSON.parse(barChart.getAttribute("data-graph-data") || "[]");

        expect(graphData).toHaveLength(4);

        expect(graphData[0]).toEqual({
            label: "Experiment 1",
            data: [
                { x: "CH4", y: 0.1 },
                { x: "CO2", y: 0.4 },
                { x: "H2O", y: 0.4 },
            ],
        });

        expect(graphData[1]).toEqual({
            label: "Experiment 2",
            data: [
                { x: "CO2", y: 0.3 },
                { x: "H2O", y: 0.5 },
                { x: "N2", y: 0.2 },
            ],
        });

        expect(graphData[2]).toEqual(mockSimulationQueries[0]);
        expect(graphData[3]).toEqual(mockSimulationQueries[1]);

        expect(barChart.getAttribute("data-aspect-ratio")).toBe("4");
    });

    it("filters chart data when components are selected", () => {
        render(
            <LabResultsPlot
                selectedExperiments={mockExperiments}
                simulationQueries={mockSimulationQueries}
                isLoading={false}
            />
        );

        const co2Checkbox = screen.getByLabelText("CO2");
        fireEvent.click(co2Checkbox);

        const barChart = screen.getByTestId("bar-chart");
        const graphData = JSON.parse(barChart.getAttribute("data-graph-data") || "[]");

        graphData.forEach((dataset: ChartDataSet) => {
            dataset.data.forEach((point: { x: string; y: number | null }) => {
                expect(point.x).toBe("CO2");
            });
        });

        expect(graphData[0].data).toEqual([{ x: "CO2", y: 0.4 }]);

        expect(graphData[1].data).toEqual([{ x: "CO2", y: 0.3 }]);
    });

    it("handles multiple component selection correctly", () => {
        render(
            <LabResultsPlot
                selectedExperiments={mockExperiments}
                simulationQueries={mockSimulationQueries}
                isLoading={false}
            />
        );

        fireEvent.click(screen.getByLabelText("CO2"));
        fireEvent.click(screen.getByLabelText("H2O"));

        const barChart = screen.getByTestId("bar-chart");
        const graphData = JSON.parse(barChart.getAttribute("data-graph-data") || "[]");

        expect(graphData[0].data).toEqual([
            { x: "CO2", y: 0.4 },
            { x: "H2O", y: 0.4 },
        ]);

        expect(graphData[1].data).toEqual([
            { x: "CO2", y: 0.3 },
            { x: "H2O", y: 0.5 },
        ]);
    });

    it("shows all data when no components are filtered", () => {
        render(
            <LabResultsPlot
                selectedExperiments={mockExperiments}
                simulationQueries={mockSimulationQueries}
                isLoading={false}
            />
        );

        const barChart = screen.getByTestId("bar-chart");
        const graphData = JSON.parse(barChart.getAttribute("data-graph-data") || "[]");

        expect(graphData[0].data).toHaveLength(3);
        expect(graphData[1].data).toHaveLength(3);
        expect(graphData[2].data).toHaveLength(3);
        expect(graphData[3].data).toHaveLength(2);
    });
});
