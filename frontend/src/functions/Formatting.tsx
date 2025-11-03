import { SimulationResults } from "@/dto/SimulationResults";
import { ChartDataSet, TabulatedResultRow } from "@/dto/ChartData";
import { ExperimentResult } from "@/dto/ExperimentResult";

export const convertToSubscripts = (chemicalFormula: string): React.ReactNode => {
    const regex = /(?<=\p{L})\d|(?=\p{L})\d/gu;
    const matches = [...chemicalFormula.matchAll(regex)];
    const subscriptsRemoved = chemicalFormula.split(regex);

    const result = subscriptsRemoved.flatMap((part, index) =>
        index < matches.length ? [part, <sub key={index}>{matches[index][0]}</sub>] : [part]
    );
    return <p>{result}</p>;
};

export const extractPlotData = (simulationResults: SimulationResults) => {
    const { modelInput, finalConcentrations } = simulationResults;
    const keys = Object.keys(finalConcentrations).filter(
        (key) => (modelInput.concentrations[key] ?? 0) >= 0.001 || (finalConcentrations[key] ?? 0) >= 0.001
    );

    const initial = keys.map((key) => ({ x: key, y: modelInput.concentrations[key] }));
    const final = keys.map((key) => ({ x: key, y: finalConcentrations[key] }));
    const change = keys.map((key) => ({
        x: key,
        y: finalConcentrations[key] - (modelInput.concentrations[key] ?? 0),
    }));

    return [
        {
            label: "Change",
            data: change,
            hidden: false,
        },
        {
            label: "Initial",
            data: initial,
            hidden: true,
        },
        {
            label: "Final",
            data: final,
            hidden: true,
        },
    ];
};

export const ISODate_to_UIDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
};

export const convertSimulationToChartData = (simulation: SimulationResults, experimentName: string): ChartDataSet => {
    return {
        label: `${simulation.modelInput.modelId} - ${experimentName}`,
        data: Object.entries(simulation.finalConcentrations).map(([x, y]) => ({ x, y })),
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
                    `${simulation.modelInput.modelId || "Unknown"} - ${experimentName}`,
                    simulation.modelInput.concentrations,
                    simulation.finalConcentrations,
                    simulation.modelInput.parameters
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
            temperature: (result.temperature ?? 0) + 273, // Convert to Kelvin
            time: result.time ?? 0,
        })
    );
};

export const downloadTabulatedDataAsCSV = (
    simulationResultsPerExperiment: Record<string, SimulationResults[]>,
    experimentResults: ExperimentResult[]
) => {
    const tabulatedData = [
        ...convertSimulationQueriesResultToTabulatedData(simulationResultsPerExperiment),
        ...convertExperimentResultsToTabulatedData(experimentResults),
    ];

    if (tabulatedData.length === 0) return;

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

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabulated_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
