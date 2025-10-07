import { describe, expect, it } from "vitest";
import { convertSimulationsToChartData, convertToSubscripts } from "../../src/functions/Formatting";
import { extractAndReplaceKeys } from "../../src/api/api";
import { SimulationResults } from "../../src/dto/SimulationResults";

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

describe("extractAndReplaceKeys", () => {
    it("should extract entries with given prefix and replace it with empty string", () => {
        const prefix_1 = "foo";
        const prefix_2 = "bar";
        const inputDict = {
            [`${prefix_1}A`]: 1,
            [`${prefix_1}B`]: 2,
            [`${prefix_2}A`]: 3,
            [`${prefix_2}B`]: 4,
        };

        let res = extractAndReplaceKeys(prefix_1, "", inputDict);
        let expectedOutput = {
            A: 1,
            B: 2,
        };

        expect(expectedOutput).toEqual(res);

        res = extractAndReplaceKeys(prefix_2, "", inputDict);
        expectedOutput = {
            A: 3,
            B: 4,
        };

        expect(expectedOutput).toEqual(res);
    });
});

describe("convertingSimulationToChartData", () => {
    const simulationResults: Record<string, SimulationResults[]> = {
        Exp1: [
            {
                panels: [],
                modelInput: { concentrations: { H2O: 0.3 }, parameters: { Temperature: 300 }, modelId: "model1" },
                finalConcentrations: { CO: 0.4, H2O: 0.4 },
            },
        ],
        Exp2: [
            {
                panels: [],
                modelInput: {
                    concentrations: { H2O: 0.2, COS: 0.5 },
                    parameters: { Temperature: 300 },
                    modelId: "model2",
                },
                finalConcentrations: { CO: 0.5, H2O: 0.3 },
            },
        ],
    };

    it("should have correct data", () => {
        const res = convertSimulationsToChartData(simulationResults);

        res.forEach((dataset) => {
            dataset.data.forEach((point: { x: string; y: number | null }) => {
                const [modelId, experimentName] = dataset.label.split(" - ");
                const experimentSimulations = simulationResults[experimentName];

                if (experimentSimulations) {
                    const matchingSimulation = experimentSimulations.find((sim) => sim.modelInput.modelId === modelId);

                    if (matchingSimulation) {
                        expect(Object.keys(matchingSimulation.finalConcentrations)).toContain(point.x);
                        expect(Object.values(matchingSimulation.finalConcentrations)).toContain(point.y);
                    }
                }
            });
        });
    });

    it("should create correct labels for each simulation", () => {
        const res = convertSimulationsToChartData(simulationResults);

        const labels = res.map((dataset) => dataset.label);
        expect(labels).toContain("model1 - Exp1");
        expect(labels).toContain("model2 - Exp2");
    });

    it("should handle multiple simulations per experiment", () => {
        const multipleSimsPerExp: Record<string, SimulationResults[]> = {
            Exp1: [
                {
                    panels: [],
                    modelInput: { concentrations: { H2O: 0.3 }, parameters: { Temperature: 300 }, modelId: "model1" },
                    finalConcentrations: { CO: 0.4, H2O: 0.4 },
                },
                {
                    panels: [],
                    modelInput: { concentrations: { H2O: 0.2 }, parameters: { Temperature: 300 }, modelId: "model2" },
                    finalConcentrations: { CO: 0.5, H2O: 0.3 },
                },
            ],
        };

        const res = convertSimulationsToChartData(multipleSimsPerExp);

        expect(res).toHaveLength(2);

        const labels = res.map((dataset) => dataset.label);
        expect(labels).toContain("model1 - Exp1");
        expect(labels).toContain("model2 - Exp1");
    });
});
