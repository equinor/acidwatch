import { Data } from "plotly.js";
import { SimulationResults } from "../dto/SimulationResults";

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
            text: values.map((value, index) => `Value: ${value}<br>Variance: ${Object.values(chartData.variance)[index]}`),
            textposition: "none",
            hoverinfo: "text",
        },
    ];
}
