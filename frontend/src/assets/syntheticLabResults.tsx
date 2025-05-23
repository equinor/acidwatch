
import { ExperimentResult } from "../dto/ExperimentResult";

export const syntheticLabResults: ExperimentResult[] = [
    {
        name: "synthetic-1",
        initial_concentrations: {
            "H2O": 1
        },
        final_concentrations: {
            "H2O": 2
        },
        pressure: 10,
        temperature: 10,
        time: 10
    },
    {
        name: "synthetic-2",
        initial_concentrations: {
            "H2O": 2
        },
        final_concentrations: {
            "H2O": 3
        },
        pressure: 15,
        temperature: 20,
        time: 15
    },
    {
        name: "synthetic-3",
        initial_concentrations: {
            "H2O": 0.5
        },
        final_concentrations: {
            "H2O": 1.5
        },
        pressure: 20,
        temperature: 25,
        time: 20
    }
];
