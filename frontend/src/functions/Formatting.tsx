import { SimulationResults } from "../dto/SimulationResults";
import { ChartDataSet } from "../dto/ChartData";
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

export const convertSimulationToChartData = (
    simulation: SimulationResults,
    modelName: string,
    experimentName: string
): ChartDataSet => {
    return {
        label: `${modelName} - ${experimentName}`,
        data: Object.entries(simulation.finalConcentrations).map(([x, y]) => ({ x, y })),
    };
};
