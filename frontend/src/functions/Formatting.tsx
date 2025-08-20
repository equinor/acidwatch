import { Data } from "plotly.js";
import { SimulationResults } from "../dto/SimulationResults";
import { ExperimentResult } from "../dto/ExperimentResult.tsx";
import { ScatterGraphData } from "../dto/ScatterGraphInput";

export const removeSubsFromString = (s: string): string => {
    s = s.replace(/<sub>/g, "");
    s = s.replace(/<\/sub>/g, "");
    return s;
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

export const extractPlotData = (simulationResults: SimulationResults): Data[] => {
    const { finalConcentrations, initialConcentrations } = simulationResults;
    const values = Object.keys(finalConcentrations).map(
        (key) => finalConcentrations[key] - (initialConcentrations[key] ?? 0)
    );
    return [
        {
            type: "bar",
            x: Object.keys(finalConcentrations),
            y: values,
            textposition: "none",
            hoverinfo: "text",
        },
    ];
};

export const addUniqueColorToGraphEntries = (graph: ScatterGraphData[], labelColors: { [key: string]: string }) => {
    return graph.map((entry) => ({
        ...entry,
        fill: labelColors[entry.label] || "#000000",
    }));
};

export const removeRedundantGraphEntries = (graph: ScatterGraphData[]) => {
    return graph.filter(
        (item, index, arr) => arr.findIndex((obj) => JSON.stringify(obj) === JSON.stringify(item)) === index
    );
};

export const ISODate_to_UIDate = (ISODate: string) => {
    const date = new Date(ISODate);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    if (isNaN(day) || month.length !== 3 || isNaN(year)) {
        return ISODate;
    }
    return `${day}. ${month} ${year}`;
};

export const ExperimentResult_to_ScatterGraphData = (results: ExperimentResult[], includedComponents?: string[]) => {
    const scatterGraphData: ScatterGraphData[] = results.flatMap((entry) =>
        Object.entries(entry.final_concentrations)
            .filter(([key]) => !includedComponents || includedComponents.includes(key))
            .map(([key, value]) => ({
                x: key,
                y: Number(value),
                label: entry.name,
            }))
    );

    return scatterGraphData;
};
