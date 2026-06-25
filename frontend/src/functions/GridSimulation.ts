import { GridSimulationResult } from "@/dto/GridSimulation";
import { SimulationResults, getCo2RichConcentrations, Phase } from "@/dto/SimulationResults";
import { TabulatedResultRow } from "@/dto/ChartData";
import { convertTabulatedDataToCSVFormat } from "@/functions/Formatting";
import { ppmMolToWeightPercent } from "@/functions/UnitConversion";

export const SIGNIFICANCE_THRESHOLD = 0.01;
export const MAX_DEFAULT_SERIES = 6;

const getModelPhases = (sim: SimulationResults, modelIndex: number): Phase[] => {
    if (sim.status !== "done" || sim.results.length === 0) return [];
    return sim.results[modelIndex]?.phases ?? [];
};

const getPhaseConcentrations = (
    sim: SimulationResults,
    modelIndex: number,
    phaseKind: string
): Record<string, number> => {
    const phases = getModelPhases(sim, modelIndex);
    const raw = phases.find((p) => p.kind === phaseKind)?.concentrations ?? {};
    if (phaseKind === "aqueous") {
        return ppmMolToWeightPercent(raw);
    }
    return raw;
};

const lastPhaseConcentrations = (sim: SimulationResults): Record<string, number> => {
    if (sim.status !== "done" || sim.results.length === 0) return {};
    const lastResult = sim.results[sim.results.length - 1];
    return getCo2RichConcentrations(lastResult.phases);
};

export const pointOutput = (
    sim: SimulationResults,
    substance: string,
    modelIndex?: number,
    phaseKind?: string
): number | null => {
    if (sim.status !== "done") return null;
    if (modelIndex !== undefined && phaseKind !== undefined) {
        return getPhaseConcentrations(sim, modelIndex, phaseKind)[substance] ?? 0;
    }
    if (modelIndex !== undefined) {
        return getCo2RichConcentrations(getModelPhases(sim, modelIndex))[substance] ?? 0;
    }
    return lastPhaseConcentrations(sim)[substance] ?? 0;
};

export const collectOutputSubstances = (
    simulations: SimulationResults[],
    modelIndex?: number,
    phaseKind?: string
): string[] => {
    const substances = new Set<string>();
    simulations.forEach((sim) => {
        if (modelIndex !== undefined && phaseKind !== undefined) {
            Object.keys(getPhaseConcentrations(sim, modelIndex, phaseKind)).forEach((s) => substances.add(s));
        } else if (modelIndex !== undefined) {
            Object.keys(getCo2RichConcentrations(getModelPhases(sim, modelIndex))).forEach((s) => substances.add(s));
        } else {
            Object.keys(lastPhaseConcentrations(sim)).forEach((s) => substances.add(s));
        }
    });
    return Array.from(substances).sort();
};

export const maxOutput = (
    simulations: SimulationResults[],
    substance: string,
    modelIndex?: number,
    phaseKind?: string
): number =>
    simulations.reduce((currentMax, sim) => {
        const val = pointOutput(sim, substance, modelIndex, phaseKind);
        return val !== null ? Math.max(currentMax, val) : currentMax;
    }, 0);

export const significantSubstances = (
    simulations: SimulationResults[],
    modelIndex?: number,
    phaseKind?: string
): string[] =>
    collectOutputSubstances(simulations, modelIndex, phaseKind).filter(
        (s) => maxOutput(simulations, s, modelIndex, phaseKind) >= SIGNIFICANCE_THRESHOLD
    );

export const defaultSelectedSubstances = (
    simulations: SimulationResults[],
    modelIndex?: number,
    phaseKind?: string
): string[] =>
    significantSubstances(simulations, modelIndex, phaseKind)
        .sort(
            (a, b) =>
                maxOutput(simulations, b, modelIndex, phaseKind) - maxOutput(simulations, a, modelIndex, phaseKind)
        )
        .slice(0, MAX_DEFAULT_SERIES);

export const visiblePhaseKinds = (simulations: SimulationResults[], modelIndex: number): string[] => {
    const kinds = new Set<string>();
    simulations.forEach((sim) => {
        getModelPhases(sim, modelIndex).forEach((phase) => {
            if (Object.values(phase.concentrations).some((v) => v > 0)) {
                kinds.add(phase.kind);
            }
        });
    });
    const order = ["co2-rich", "aqueous"];
    return order.filter((k) => kinds.has(k));
};

export const buildGridCsv = (result: GridSimulationResult): string => {
    const rows: TabulatedResultRow[] = result.simulations
        .filter((sim) => sim.status === "done")
        .map((sim) => {
            const row: TabulatedResultRow = {};
            result.axes.forEach((axis) => {
                row[`In_${axis.substance}`] = sim.input.concentrations[axis.substance] ?? 0;
            });
            Object.entries(lastPhaseConcentrations(sim)).forEach(([substance, value]) => {
                row[`Out_${substance}`] = value;
            });
            return row;
        });

    return convertTabulatedDataToCSVFormat(rows);
};
