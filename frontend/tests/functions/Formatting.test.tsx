import { describe, expect, it } from "vitest";
import {
    convertToSubscripts,
    convertSimulationToChartData,
    convertSimulationQueriesResultToTabulatedData,
    convertExperimentResultsToTabulatedData,
} from "@/functions/Formatting";
import { SimulationResults } from "@/dto/SimulationResults";
import { ModelInput } from "@/dto/ModelInput";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { TabulatedResultRow } from "@/dto/ChartData";

describe("convertToSubscripts", () => {
    it("should return empty div when provided an empty string", () => {
        const inp = "";

        const res = convertToSubscripts(inp);

        expect(res).toEqual(<p>{[""]}</p>);
    });
    it("should format NO2 to NO<sub>2</sub>", () => {
        const inp = "NO2";

        const res = convertToSubscripts(inp);

        expect(res).toEqual(<p>{["NO", <sub key={0}>2</sub>, ""]}</p>);
    });
    it("should only format the last 2 in 2 NO2", () => {
        const inp = "2 NO2";

        const res = convertToSubscripts(inp);

        expect(res).toEqual(<p>{["2 NO", <sub key={0}>2</sub>, ""]}</p>);
    });
});

describe("convertingSimulationToChartData", () => {
    const simulation: SimulationResults = {
        modelInput: { concentrations: { CO: 0.5, H20: 0.7 }, parameters: {}, modelId: "Narnia" } as ModelInput,
        finalConcentrations: { H2CO3: 0.3, N2: 0.9 },
        panels: [],
    };
    it("converts simulation to chart data correctly", () => {
        const chartData = convertSimulationToChartData(simulation, "Welcome to Narnia");
        expect(chartData.label).toEqual("Narnia - Welcome to Narnia");
        expect(chartData.data).toEqual([
            { x: "H2CO3", y: 0.3 },
            { x: "N2", y: 0.9 },
        ]);
    });
});

describe("Table Data Conversion Functions", () => {
    describe("Convert simulation results directly to tabulated data", () => {
        it("should convert simulation results directly to chart data table format", () => {
            const mockSimulationQueriesResults: Record<string, SimulationResults[]> = {
                Exp1: [
                    {
                        modelInput: {
                            modelId: "TOCOMO",
                            concentrations: { O2: 22 },
                            parameters: { pressure: 1, temperature: 22 },
                        },
                        finalConcentrations: { O2: 32 },
                        panels: [],
                    },
                ],
                Exp2: [
                    {
                        modelInput: {
                            modelId: "arcs",
                            concentrations: { O2: 22 },
                            parameters: { pressure: 1, temperature: 22 },
                        },
                        finalConcentrations: { O2: 30 },
                        panels: [],
                    },
                ],
            };
            const tabulatedResult: TabulatedResultRow[] =
                convertSimulationQueriesResultToTabulatedData(mockSimulationQueriesResults);
            const expectedTabulatedResult: TabulatedResultRow[] = [
                { label: "TOCOMO - Exp1", In_O2: 22, Out_O2: 32, temperature: 22, pressure: 1 },
                { label: "arcs - Exp2", In_O2: 22, Out_O2: 30, temperature: 22, pressure: 1 },
            ];

            expect(tabulatedResult).toEqual(expectedTabulatedResult);
        });
    });
    describe("Convert experiment results directly to tabulated data", () => {
        it("should convert experiment results directly to tabulated data format", () => {
            const mockExperimentResults: ExperimentResult[] = [
                {
                    name: "LabExp1",
                    time: 60,
                    temperature: 20,
                    pressure: 1.2,
                    initialConcentrations: { CO2: 0.8 },
                    finalConcentrations: { CO2: 0.5 },
                },
                {
                    name: "LabExp2",
                    time: 90,
                    temperature: 25,
                    pressure: 1.5,
                    initialConcentrations: { CO2: 0.7 },
                    finalConcentrations: { CO2: 0.4 },
                },
            ];

            const tabulatedResult: TabulatedResultRow[] =
                convertExperimentResultsToTabulatedData(mockExperimentResults);

            const expectedTabulatedResult: TabulatedResultRow[] = [
                { label: "LabExp1", In_CO2: 0.8, Out_CO2: 0.5, temperature: 293, pressure: 1.2, time: 60 },
                { label: "LabExp2", In_CO2: 0.7, Out_CO2: 0.4, temperature: 298, pressure: 1.5, time: 90 },
            ];

            expect(tabulatedResult).toEqual(expectedTabulatedResult);
        });
    });
});
