import { describe, expect, it } from "vitest";
import { convertToSubscripts, convertSimulationToChartData } from "../../src/functions/Formatting";
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
                initialConcentrations: { H2O: 0.3 },
                finalConcentrations: { CO: 0.4, H2O: 0.4 },
            },
            {
                panels: [],
                initialConcentrations: { H2O: 0.2, COS: 0.5 },
                finalConcentrations: { CO: 0.5, H2O: 0.3 },
            },
    ]

    it("should have necessary properties in the returning object", () => {   
        const res = convertSimulationToChartData(simulationResult[0], "Primary CO Model", "Test Simulation 1");

        expect(res).toHaveProperty("label");
        expect(res).toHaveProperty("data");

    })

    it("should have correct data", () => {
        
        simulationResult.forEach(simRes => {
            const res = convertSimulationToChartData(simRes, "Model Name", "Experiment Name");
            expect(res.data.length).toBe(Object.entries(simRes.finalConcentrations).length);
            
            expect(res.data.forEach((point) => {
                expect(Object.keys(simRes.finalConcentrations)).toContain(point.x);
                expect(Object.values(simRes.finalConcentrations)).toContain(point.y)
            }));
        });      
    })



});
