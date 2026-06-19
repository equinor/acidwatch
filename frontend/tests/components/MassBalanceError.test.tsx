import { describe, it, expect } from "vitest";
import { getMasses, getMassBalanceError } from "@/components/Simulation/MassBalanceError";

describe("getMasses", () => {
    it("empty", () => {
        expect(getMasses({})).toEqual({});
    });

    it("simple", () => {
        const concs = {
            H2O: 1,
            NO2: 2,
            N2: 3,
        };

        expect(getMasses(concs)).toEqual({
            H: 2,
            N: 8,
            O: 5,
        });
    });

    it("organic chem", () => {
        // In organic chemistry they like to repeat symbols, so make sure we
        // handle this correctly
        const concs = {
            CH3COOH: 1,
        };

        expect(getMasses(concs)).toEqual({
            C: 2,
            H: 4,
            O: 2,
        });
    });

    it("groups", () => {
        expect(getMasses({ "CH(CH3)3": 1 })).toEqual({ C: 4, H: 10 });
        expect(getMasses({ "CH(CH3)3": 1.5 })).toEqual({ C: 6, H: 15 });

        // Silly example, but it shows that deeply nested groups still work
        expect(getMasses({ "B(CF(CH)3)2": 1 })).toEqual({ B: 1, C: 8, F: 2, H: 6 });
    });

    it("unpaired paranthesis results in an exception", () => {
        expect(() => getMasses({ "CH(CH3": 1 })).toThrowErrorMatchingInlineSnapshot(
            "[Error: Couldn't parse substance: CH(CH3]"
        );
    });
});

describe("MassBalanceError", () => {
    const concs = {
        H2O: 1,
        NO2: 2,
        N2: 3,
    };

    const singlePhase = (concentrations: Record<string, number>) => [
        { kind: "co2-rich" as const, fraction: 1, concentrations },
    ];

    it("error is 0 when the numbers are the same", () => {
        expect(getMassBalanceError(singlePhase(concs), singlePhase(concs)).error).toBe(0);
    });

    it("error is small when difference is small", () => {
        const final = Object.fromEntries(Object.entries(concs).map(([subst, amount]) => [subst, amount + 1e-3]));

        expect(getMassBalanceError(singlePhase(concs), singlePhase(final)).error).toBeLessThan(0.01);
    });

    it("error is large when order of magnitude difference is large", () => {
        expect(
            getMassBalanceError(singlePhase(concs), singlePhase({ ...concs, NO2: concs.NO2 * 2 })).error
        ).toBeGreaterThan(100.0);
        expect(
            getMassBalanceError(singlePhase(concs), singlePhase({ ...concs, NO2: concs.NO2 / 2 })).error
        ).toBeGreaterThan(100.0);
    });

    it("error is 0 when mass is conserved across multiple phases", () => {
        const phases = [
            { kind: "co2-rich" as const, fraction: 0.6, concentrations: { H2O: 1, NO2: 2, N2: 3 } },
            { kind: "aqueous" as const, fraction: 0.4, concentrations: { H2O: 1, NO2: 2, N2: 3 } },
        ];
        expect(getMassBalanceError(singlePhase(concs), phases).error).toBeCloseTo(0, 5);
    });

    it("error is 0 when both init and final have multiple phases", () => {
        const initPhases = [
            { kind: "co2-rich" as const, fraction: 0.8, concentrations: { H2O: 1, NO2: 2 } },
            { kind: "aqueous" as const, fraction: 0.2, concentrations: { H2O: 1, NO2: 2 } },
        ];
        const finalPhases = [
            { kind: "co2-rich" as const, fraction: 0.5, concentrations: { H2O: 1, NO2: 2 } },
            { kind: "aqueous" as const, fraction: 0.5, concentrations: { H2O: 1, NO2: 2 } },
        ];
        expect(getMassBalanceError(initPhases, finalPhases).error).toBeCloseTo(0, 5);
    });
});
