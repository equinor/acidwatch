import { describe, it, expect } from "vitest";
import { getMasses, getMassBalanceError } from "../../src/components/MassBalanceError";

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
});

describe("MassBalanceError", () => {
    const concs = {
        H2O: 1,
        NO2: 2,
        N2: 3,
    };

    it("error is 0 when the numbers are the same", () => {
        expect(getMassBalanceError(concs, concs).error).toBe(0);
    });

    it("error is small when difference is small", () => {
        const final = Object.fromEntries(Object.entries(concs).map(([subst, amount]) => [subst, amount + 1e-3]));

        expect(getMassBalanceError(concs, final).error).toBeLessThan(0.01);
    });

    it("error is large when order of magnitude difference is large", () => {
        expect(getMassBalanceError(concs, { ...concs, NO2: concs.NO2 * 2 }).error).toBeGreaterThan(100.0);
        expect(getMassBalanceError(concs, { ...concs, NO2: concs.NO2 / 2 }).error).toBeGreaterThan(100.0);
    });
});
