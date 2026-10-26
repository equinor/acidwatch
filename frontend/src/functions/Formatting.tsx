import { SimulationResults, Phase, getCo2RichConcentrations } from "@/dto/SimulationResults";
import { ChartDataSet, TabulatedResultRow } from "@/dto/ChartData";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { EXPERIMENT_PATTERNS, getLabResultColor } from "@/functions/Colors";

// Adaptive precision: finds enough decimals to show a small value
// e.g. gap=0.0001 → 5 decimals, gap=0.05 → 2 decimals
const adaptiveDecimals = (gap: number, max = 6): number => Math.min(Math.max(1, Math.ceil(-Math.log10(gap)) + 1), max);

export const formatPhaseFraction = (fraction: number): string => {
    const percent = fraction * 100;

    if (percent === 0 || percent === 100) return `${percent.toFixed(1)}%`;

    if (percent < 1e-5) {
        return `${percent.toExponential(2)}%`;
    }

    if (percent < 0.1) {
        return `${percent.toFixed(adaptiveDecimals(percent))}%`;
    }

    if (percent > 99.9) {
        const gap = 100 - percent;
        if (gap < 1e-5) return "≈100%";
        return `${percent.toFixed(adaptiveDecimals(gap))}%`;
    }

    return `${percent.toFixed(1)}%`;
};

export const formatConcentration = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "-";

    const absValue = Math.abs(value);
    if (absValue === 0) return "0";
    if (absValue >= 1e5 || absValue <= 1e-5) return value.toExponential(2);
    return value.toFixed(2);
};

export const convertToSubscripts = (chemicalFormula: string): React.ReactNode => {
    const regex = /(?<=\p{L})\d|(?=\p{L})\d/gu;
    const matches = [...chemicalFormula.matchAll(regex)];
    const subscriptsRemoved = chemicalFormula.split(regex);

    const result = subscriptsRemoved.flatMap((part, index) =>
        index < matches.length ? [part, <sub key={index}>{matches[index][0]}</sub>] : [part]
    );
    return <p>{result}</p>;
};

export interface StackedSimulation {
    label: string;
    inputConcentrations: Record<string, number>;
    phases: Phase[];
}

const INITIAL_COLOR = "#9E9E9E";
const PHASE_SHADES: Record<Phase["kind"], number> = { "co2-rich": 2, aqueous: 4 };

export const extractChartData = (simulations: StackedSimulation[]): ChartDataSet[] => {
    const hasSignificantValue = (value: number | undefined) => (value ?? 0) >= 0.001;
    const initialConcentrations = simulations[0]?.inputConcentrations ?? {};
    const phaseSets = simulations.flatMap(({ phases }) => phases);
    const allKeys = Array.from(
        new Set([
            ...Object.keys(initialConcentrations),
            ...phaseSets.flatMap((phase) => Object.keys(phase.concentrations)),
        ])
    );
    const keys = allKeys.filter(
        (key) =>
            key != "CO2" &&
            (hasSignificantValue(initialConcentrations[key]) ||
                phaseSets.some((phase) => hasSignificantValue(phase.concentrations[key])))
    );

    const initialDatasets: ChartDataSet[] = [
        {
            label: "Initial",
            data: keys.map((key) => ({ x: key, y: initialConcentrations[key] ?? 0 })),
            stack: "initial",
            color: INITIAL_COLOR,
        },
    ];

    const outputDatasets = simulations.flatMap(({ label, phases }, index) => {
        const prefix = simulations.length > 1 ? `${label}: ` : "";
        const pattern = EXPERIMENT_PATTERNS[index % EXPERIMENT_PATTERNS.length];
        return phases.map((phase) => ({
            label: `${prefix}${phase.kind} (${formatPhaseFraction(phase.fraction)})`,
            data: keys.map((key) => ({
                x: key,
                y: (phase.concentrations[key] ?? 0) * phase.fraction,
            })),
            stack: `output-${index}`,
            color: getLabResultColor(index, PHASE_SHADES[phase.kind]),
            pattern,
        }));
    });

    return [...initialDatasets, ...outputDatasets];
};

export const convertSimulationToChartData = (simulation: SimulationResults, experimentName: string): ChartDataSet => {
    const concentrations = getCo2RichConcentrations(simulation.results[0]?.phases);
    return {
        label: `${simulation.input.models[0].modelId} - ${experimentName}`,
        data: Object.entries(concentrations)
            .filter(([x, y]) => x != "CO2" || y !== 0)
            .map(([x, y]) => ({ x, y })),
    };
};

const buildTabulatedRow = (
    label: string,
    inputsConcentrations: Record<string, number>,
    finalConcentration: Record<string, number>,
    parameters: Record<string, number | string>
): TabulatedResultRow => {
    const row: TabulatedResultRow = {};

    row["label"] = label;

    Object.entries(inputsConcentrations).forEach(([component, value]) => {
        row[`In_${component}`] = value;
    });

    Object.entries(finalConcentration).forEach(([component, value]) => {
        row[`Out_${component}`] = value;
    });

    Object.entries(parameters).forEach(([param, value]) => {
        row[param] = value;
    });

    return row;
};

export const convertSimulationQueriesResultToTabulatedData = (
    simulationResultsPerExperiment: Record<string, SimulationResults[]>
): TabulatedResultRow[] => {
    const tabulatedData: TabulatedResultRow[] = [];

    Object.entries(simulationResultsPerExperiment).forEach(([experimentName, simulations]) => {
        simulations.forEach((simulation) => {
            tabulatedData.push(
                buildTabulatedRow(
                    `${simulation.input.models[0].modelId || "Unknown"} - ${experimentName}`,
                    simulation.input.concentrations,
                    getCo2RichConcentrations(simulation.results[0]?.phases),
                    { ...simulation.input.conditions, ...simulation.input.models[0].parameters }
                )
            );
        });
    });

    return tabulatedData;
};

export const convertExperimentResultsToTabulatedData = (
    experimentResults: ExperimentResult[]
): TabulatedResultRow[] => {
    return experimentResults.map((result) =>
        buildTabulatedRow(result.name ?? "", result.initialConcentrations, result.finalConcentrations, {
            pressure: result.pressure ?? 0,
            temperature: result.temperature ?? 0,
            time: result.time ?? 0,
        })
    );
};

export function convertTabulatedDataToCSVFormat(tabulatedData: TabulatedResultRow[]): string {
    if (tabulatedData.length === 0) return "";

    const allKeys = Array.from(
        tabulatedData.reduce((set, row) => {
            Object.keys(row).forEach((key) => set.add(key));
            return set;
        }, new Set<string>())
    );

    const filteredKeys = allKeys.filter((key) =>
        tabulatedData.some((row) => {
            const val = row[key];
            return !(val === 0 || val === "" || val === undefined);
        })
    );

    const header = filteredKeys;
    const rows = tabulatedData.map((row) => header.map((key) => (row[key] !== undefined ? row[key] : "")));

    const csvContent = [header, ...rows]
        .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    return csvContent;
}
export const downloadTabulatedDataAsCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
