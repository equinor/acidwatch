import { Data } from "plotly.js";
import { SimulationResults } from "../dto/SimulationResults";
import { ScatterGraphData } from "../dto/GraphInput";

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
    return graph.map((entry) => (
        {
      ...entry,
      fill: labelColors[entry.label] || "#000000",
  }));
}

export const removeRedundantGraphEntries = (graph: ScatterGraphData[]) => {
    return graph.filter((item, index, arr) =>
      arr.findIndex(obj => JSON.stringify(obj) === JSON.stringify(item)) === index
    );
  };

export const getCurrentDate = () => {
    const currentDate = new Date();
    const day = currentDate.getDate();
    const month = currentDate.toLocaleString("default", { month: "short" });
    const year = currentDate.getFullYear();
    return `${day}. ${month} ${year}`
}