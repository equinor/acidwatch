// Laboratory results from
//
// @article{morland2019acid,
//   title={Acid reactions in hub systems consisting of separate non-reactive CO2 transport lines},
//   author={Morland, Bj{\o}rn H and Tjelta, Morten and Norby, Truls and Svenningsen, Gaute},
//   journal={International Journal of Greenhouse Gas Control},
//   volume={87},
//   pages={246--255},
//   year={2019},
//   publisher={Elsevier}
// }

import { ExperimentResult } from "@/dto/ExperimentResult";

export const paperResults: ExperimentResult[] = [
    {
        finalConcentrations: {
            H2O: 450,
            H2S: 0,
            SO2: 8.5,
            NO2: 0.2,
            O2: 4,
            NO: 1,
        },
        initialConcentrations: {
            H2O: 100,
            H2S: 5.5,
            SO2: 5,
            NO2: 5,
            O2: 12,
        },
        name: "Hub01_1",
        pressure: 100,
        temperature: 25,
        time: 26,
    },
    {
        finalConcentrations: {
            H2O: 550,
            H2S: 0,
            SO2: 12,
            NO2: 0,
            O2: 0.5,
            NO: 4,
        },
        initialConcentrations: {
            H2O: 100,
            H2S: 5.5,
            SO2: 5,
            NO2: 5,
            O2: 12,
        },
        name: "Hub01_2",
        pressure: 100,
        temperature: 25,
        time: 163,
    },
    {
        finalConcentrations: {
            H2O: 75,
            H2S: 0,
            SO2: 21,
            NO2: 8,
            O2: 9,
            NO: 1.5,
        },
        initialConcentrations: {
            H2O: 35,
            H2S: 10,
            SO2: 12,
            NO2: 10,
            O2: 31,
        },
        name: "Hub02",
        pressure: 100,
        temperature: 25,
        time: 84,
    },
    {
        finalConcentrations: {
            H2O: 96,
            H2S: 0,
            SO2: 32,
            NO2: 4,
            O2: 0,
            NO: 5,
        },
        initialConcentrations: {
            H2O: 120,
            H2S: 41,
            SO2: 38,
            NO2: 26,
            O2: 95,
        },
        name: "Hub03",
        pressure: 100,
        temperature: 25,
        time: 84,
    },
];
