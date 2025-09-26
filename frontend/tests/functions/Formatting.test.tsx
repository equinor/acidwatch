import { describe, expect, it } from "vitest";
import { convertToSubscripts, convertSimulationsToChartData } from "../../src/functions/Formatting";
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
    const simulationResult: SimulationResults[] = [
        {
            panels: [],
            modelInput: { concentrations: { H2O: 0.3 }, parameters: { Temperature: 300 }, modelId: "model1" },
            finalConcentrations: { CO: 0.4, H2O: 0.4 },
        },
        {
            panels: [],
            modelInput: { concentrations: { H2O: 0.2, COS: 0.5 }, parameters: { Temperature: 300 }, modelId: "model2" },
            finalConcentrations: { CO: 0.5, H2O: 0.3 },
        },
    ];

    it("should have necessary properties in the returning object", () => {
        const res = convertSimulationsToChartData(simulationResult, ["Exp1", "Exp2"]);

        expect(res.every((item) => Object.prototype.hasOwnProperty.call(item, "label"))).toBe(true);
        expect(res.every((item) => Object.prototype.hasOwnProperty.call(item, "data"))).toBe(true);
    });

    it("should have correct data", () => {
        simulationResult.forEach((simRes) => {
            const res = convertSimulationsToChartData([simRes], ["Exp1", "Exp2"]);

            res.forEach((dataset) => {
                dataset.data.forEach((point: { x: string; y: number | null }) => {
                    expect(Object.keys(simRes.finalConcentrations)).toContain(point.x);
                    expect(Object.values(simRes.finalConcentrations)).toContain(point.y);
                });
            });
        });
    });
});
