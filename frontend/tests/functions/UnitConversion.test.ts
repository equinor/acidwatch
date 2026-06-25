import { describe, it, expect } from "vitest";
import { ppmMolToWeightPercent } from "@/functions/UnitConversion";

describe("ppmMolToWeightPercent", () => {
    it("returns empty object for empty input", () => {
        expect(ppmMolToWeightPercent({})).toEqual({});
    });

    it("converts single component to 100 wt%", () => {
        const result = ppmMolToWeightPercent({ CO2: 1_000_000 });
        expect(result.CO2).toBeCloseTo(100, 5);
    });

    it("converts two equal-mole components by molecular weight ratio", () => {
        const result = ppmMolToWeightPercent({ CO2: 500_000, H2O: 500_000 });
        const mwCO2 = 12.011 + 2 * 15.999;
        const mwH2O = 2 * 1.008 + 15.999;
        const expectedCO2 = (mwCO2 / (mwCO2 + mwH2O)) * 100;
        const expectedH2O = (mwH2O / (mwCO2 + mwH2O)) * 100;
        expect(result.CO2).toBeCloseTo(expectedCO2, 4);
        expect(result.H2O).toBeCloseTo(expectedH2O, 4);
    });

    it("weight percentages sum to 100", () => {
        const result = ppmMolToWeightPercent({ CO2: 300_000, H2O: 600_000, H2S: 100_000 });
        const total = Object.values(result).reduce((sum, v) => sum + v, 0);
        expect(total).toBeCloseTo(100, 5);
    });

    it("handles complex formulas with parentheses", () => {
        const result = ppmMolToWeightPercent({ "(CH2CH2OH)2O": 500_000, H2O: 500_000 });
        const total = Object.values(result).reduce((sum, v) => sum + v, 0);
        expect(total).toBeCloseTo(100, 5);
    });

    it("throws if an atom has no known mass", () => {
        expect(() => ppmMolToWeightPercent({ CO2: 500_000, UF6: 500_000 })).toThrow("Unknown atomic mass for atom: U");
    });

    it("returns empty object if total mass is zero", () => {
        const result = ppmMolToWeightPercent({ CO2: 0, H2O: 0 });
        expect(result).toEqual({});
    });
});
