import { describe, expect, it } from "vitest";
import { convertSimulationToChartData, convertToSubscripts } from "../../src/functions/Formatting";
import { extractAndReplaceKeys } from "../../src/api/api";
import { SimulationResults } from "../../src/dto/SimulationResults";
import { ModelInput } from "../../src/dto/ModelInput";

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
