import { ExperimentResult } from "../dto/ExperimentResult";

export const syntheticResults: ExperimentResult[] = [
    {
        final_concentrations: {
            H2O: 60,
            H2S: NaN,
            NO: 0,
            NO2: 1.2,
            O2: NaN,
            SO2: 13,
        },
        initial_concentrations: {
            H2O: 70,
            H2S: 0,
            NO2: 10,
            O2: 0,
            SO2: 25,
        },
        name: "Exp1",
        pressure: 100,
        temperature: 25,
        time: 0,
    },
    {
        final_concentrations: {
            H2O: 190,
            H2S: 90,
            NO2: 80,
            O2: 0,
            SO2: 0,
        },
        initial_concentrations: {
            H2O: 300,
            H2S: 100,
            NO2: 100,
            O2: 0,
            SO2: 0,
        },
        name: "Exp2",
        pressure: 100,
        temperature: 25,
        time: 0,
    },
];
