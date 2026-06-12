import { GridSimulationResult } from "@/dto/GridSimulation";
import { SimulationResults, getCo2RichConcentrations } from "@/dto/SimulationResults";
import { TabulatedResultRow } from "@/dto/ChartData";
import { convertTabulatedDataToCSVFormat } from "@/functions/Formatting";

export const SIGNIFICANCE_THRESHOLD = 0.01;
export const MAX_DEFAULT_SERIES = 6;

const lastPhaseConcentrations = (sim: SimulationResults): Record<string, number> => {
    if (sim.status !== "done" || sim.results.length === 0) return {};
    const lastResult = sim.results[sim.results.length - 1];
    return getCo2RichConcentrations(lastResult.phases);
};

export const pointOutput = (sim: SimulationResults, substance: string): number | null =>
    sim.status === "done" ? (lastPhaseConcentrations(sim)[substance] ?? 0) : null;

export const collectOutputSubstances = (simulations: SimulationResults[]): string[] => {
    const substances = new Set<string>();
    simulations.forEach((sim) => {
        Object.keys(lastPhaseConcentrations(sim)).forEach((s) => substances.add(s));
    });
    return Array.from(substances).sort();
};

export const maxOutput = (simulations: SimulationResults[], substance: string): number =>
    simulations.reduce(
        (currentMax, sim) =>
            sim.status === "done" ? Math.max(currentMax, lastPhaseConcentrations(sim)[substance] ?? 0) : currentMax,
        0
    );

export const significantSubstances = (simulations: SimulationResults[]): string[] =>
    collectOutputSubstances(simulations).filter((s) => maxOutput(simulations, s) >= SIGNIFICANCE_THRESHOLD);

export const defaultSelectedSubstances = (simulations: SimulationResults[]): string[] =>
    significantSubstances(simulations)
        .sort((a, b) => maxOutput(simulations, b) - maxOutput(simulations, a))
        .slice(0, MAX_DEFAULT_SERIES);

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
