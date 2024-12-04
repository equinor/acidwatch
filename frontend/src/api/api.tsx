import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";

type inputConcentrations = {
    [key: string]: number;
};

type FormConfig = {
    inputConcentrations: {
        [key: string]: {
            defaultvalue: number;
        };
    };
    settings: {
        Temperature: {
            defaultvalue: number;
        };
        Pressure: {
            defaultvalue: number;
        };
        SampleLength: {
            defaultvalue: number;
        };
    };
};

export const runSimulation = async (formConfig: FormConfig): Promise<SimulationResults> => {
    const absoluteConcentrations: inputConcentrations = {};

    Object.keys(formConfig.inputConcentrations).forEach((key) => {
        absoluteConcentrations[key] = formConfig.inputConcentrations[key].defaultvalue;
    });

    for (const key in absoluteConcentrations) {
        absoluteConcentrations[key as keyof inputConcentrations] /= 1000000;
    }

    const token = await getAccessToken();
    console.log("Token:", token);

    const response = await fetch(config.API_URL + "/run_simulation", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
            temperature: formConfig.settings.Temperature.defaultvalue,
            pressure: formConfig.settings.Pressure.defaultvalue,
            concs: absoluteConcentrations,
            samples: formConfig.settings.SampleLength.defaultvalue,
        }),
    });

    if (!response.ok) {
        throw new Error("Network error");
    }

    return response.json();
};

export const getModels = async () => {
    const response = await fetch(config.API_URL + "/models", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Network error");
    }

    return response.json();
};
