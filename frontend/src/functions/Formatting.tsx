import { Data } from "plotly.js";
import { SimulationResults } from "../dto/SimulationResults";
import { ScatterGraphData } from "../dto/ScatterGraphInput";
import { Row } from "@equinor/eds-data-grid-react";

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
    const chartData = simulationResults.chart_data;
    const values = Object.values(chartData.values);
    return [
        {
            type: "bar",
            x: Object.values(chartData.comps),
            y: values,
            text: values.map(
                (value, index) => `Value: ${value}<br>Variance: ${Object.values(chartData.variance)[index]}`
            ),
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

export const rowRecord_to_ScatterGraphData = (
    rowRecord: Record<string, Row<{ meta: {}; id: string; name: string; time: string }>>
) => {
    const scatterGraphData: ScatterGraphData[] = [];
    const keyFilterValues = ["time", "id", "name", "meta"];

    Object.values(rowRecord).forEach((row) => {
        Object.entries(row.original)
            .filter(
                ([component, conc]) =>
                    !keyFilterValues.includes(component) && !component.startsWith("in-") && !isNaN(Number(conc))
            )
            .forEach(([component, conc]) => {
                scatterGraphData.push({
                    x: component.replace("out-", ""),
                    y: Number(conc),
                    label: row.original.name,
                });
            });
    });

    return scatterGraphData;
};

export const graphComponentsAndRowRecord_to_ScatterGraphData = (
    rowRecord: Record<string, Row<{ meta: {}; id: string; name: string; time: string }>>,
    components: String[]
) => {
    const scatterGraphData: ScatterGraphData[] = [];
    Object.values(rowRecord).forEach((row) => {
        Object.entries(row.original)
            .filter(
                ([component, conc]) =>
                    components.includes(component.replace("out-", "")) &&
                    !component.startsWith("in-") &&
                    !isNaN(Number(conc))
            )
            .forEach(([component, conc]) => {
                scatterGraphData.push({
                    x: row.original.name,
                    y: Number(conc),
                    label: component.replace("out-", ""),
                });
            });
    });

    return scatterGraphData;
};
