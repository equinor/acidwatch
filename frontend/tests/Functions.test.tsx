import { describe, expect, it } from "vitest";
import { convertToSubscripts } from "../src/functions/Formatting";
import { extractAndReplaceKeys } from "../src/api/api";
import React from "react";
import { calculateNumberOfSimulations } from "../src/functions/Calculations";

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

describe("calculateNumberOfSimulations", () => {
    it("should only predict 1 run given no selected components", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 2, step: 1 },
            c2: { conc: 1, from: 1, to: 2, step: 1 },
            c3: { conc: 1, from: 1, to: 2, step: 1 },
        };
        const selectedComponents = new Set([]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(1);
    });

    it("should only count selected components", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 3, step: 1 },
            c2: { conc: 1, from: 1, to: 2, step: 1 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(3);
    });

    it("should predict exponentially demanding runs", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 100, step: 1 },
            c2: { conc: 1, from: 1, to: 100, step: 1 },
            c3: { conc: 1, from: 1, to: 100, step: 1 },
        };
        const selectedComponents = new Set(["c1", "c2", "c3"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(1000000);
    });

    it("should handle decreasing ranges", () => {
        const componentConcs = {
            c1: { conc: 1, from: 3, to: 1, step: 1 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(3);
    });

    it("should predict range 0 to produce 1 simulation", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 1, step: 1 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(1);
    });

    it("should handle decimal steps", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 2, step: 0.5 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(3); // 1.0 , 1.5 , 2.0
    });

    it("should properly predict simulations when range is not divisible by step (undershooting)", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 2, step: 0.49 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(3); // 1 , 1.49 , 1.98
    });

    it("should properly predict simulations when range is not divisible by step (overshooting)", () => {
        const componentConcs = {
            c1: { conc: 1, from: 1, to: 2, step: 0.51 },
        };
        const selectedComponents = new Set(["c1"]);

        const res = calculateNumberOfSimulations(componentConcs, selectedComponents);

        expect(res).toBe(2); // 1 , 1.51
    });
});
