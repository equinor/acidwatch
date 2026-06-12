import { SweepPoint } from "@/dto/Sweep";
import { SweepResults } from "@/dto/Sweep";
import { TabulatedResultRow } from "@/dto/ChartData";
import { convertTabulatedDataToCSVFormat } from "@/functions/Formatting";

export const SIGNIFICANCE_THRESHOLD = 0.01;
export const MAX_DEFAULT_SERIES = 6;

export const pointOutput = (point: SweepPoint, substance: string): number | null =>
    point.status === "done" ? (point.concentrations[substance] ?? 0) : null;

export const collectOutputSubstances = (points: SweepPoint[]): string[] => {
    const substances = new Set<string>();
    points.forEach((point) => {
        if (point.status === "done") {
            Object.keys(point.concentrations).forEach((substance) => substances.add(substance));
        }
    });
    return Array.from(substances).sort();
};

export const maxOutput = (points: SweepPoint[], substance: string): number =>
    points.reduce(
        (currentMax, point) =>
            point.status === "done" ? Math.max(currentMax, point.concentrations[substance] ?? 0) : currentMax,
        0
    );

export const significantSubstances = (points: SweepPoint[]): string[] =>
    collectOutputSubstances(points).filter((substance) => maxOutput(points, substance) >= SIGNIFICANCE_THRESHOLD);

export const defaultSelectedSubstances = (points: SweepPoint[]): string[] =>
    significantSubstances(points)
        .sort((a, b) => maxOutput(points, b) - maxOutput(points, a))
        .slice(0, MAX_DEFAULT_SERIES);

export const buildSweepCsv = (sweepResults: SweepResults): string => {
    const rows: TabulatedResultRow[] = sweepResults.points
        .filter((point) => point.status === "done")
        .map((point) => {
            const row: TabulatedResultRow = { [`In_${sweepResults.sweptSubstance}`]: point.value };
            Object.entries(point.concentrations).forEach(([substance, value]) => {
                row[`Out_${substance}`] = value;
            });
            return row;
        });

    return convertTabulatedDataToCSVFormat(rows);
};
