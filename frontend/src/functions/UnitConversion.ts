import { ATOMIC_MASSES } from "@/constants/atomic_masses";
import { parseFormula } from "@/functions/FormulaParser";

function molecularWeight(formula: string): number {
    const atoms = parseFormula(formula);
    let total = 0;
    for (const [atom, count] of Object.entries(atoms)) {
        const mass = ATOMIC_MASSES[atom];
        if (mass === undefined) throw new Error(`Unknown atomic mass for atom: ${atom} (in formula: ${formula})`);
        total += mass * count;
    }
    return total;
}

export function ppmMolToWeightPercent(concentrations: Record<string, number>): Record<string, number> {
    const entries = Object.entries(concentrations);
    if (entries.length === 0) return {};

    let totalMass = 0;
    const masses: Record<string, number> = {};

    for (const [component, ppm] of entries) {
        const mw = molecularWeight(component);
        const moles = ppm / 1_000_000;
        const mass = moles * mw;
        masses[component] = mass;
        totalMass += mass;
    }

    if (totalMass === 0) return {};

    const result: Record<string, number> = {};
    for (const [component, mass] of Object.entries(masses)) {
        result[component] = (mass / totalMass) * 100;
    }
    return result;
}
