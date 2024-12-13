import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";

type inputConcentrations = {
    [key: string]: number;
};
type settings = {
    [key: string]: number;
};

type FormConfig = {
    inputConcentrations: {
        [key: string]: {
            defaultvalue: number;
        };
    };
    settings: {
        [key: string]: {
            defaultvalue: number;
        };
    };
};

export const runSimulation = async (formConfig: FormConfig, selectedApi: string): Promise<SimulationResults> => {
    const absoluteConcentrations: inputConcentrations = {};
    const settings: settings = {};
    Object.keys(formConfig.inputConcentrations).forEach((key) => {
        absoluteConcentrations[key] = formConfig.inputConcentrations[key].defaultvalue;
    });
    Object.keys(formConfig.settings).forEach((key) => {
        settings[key] = formConfig.settings[key].defaultvalue;
    });

    for (const key in absoluteConcentrations) {
        absoluteConcentrations[key as keyof inputConcentrations] /= 1000000;
    }
    const apiUrl = `${config.API_URL}/models/${selectedApi}/runs`;
    const token = await getAccessToken();

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
            concs: absoluteConcentrations,
            settings: settings,
        }),
    });

    if (!response.ok) {
        throw new Error("Network error");
    }

    return response.json();
};

export const getModels = async (): Promise<string[]> => {
    const token = await getAccessToken();

    const response = await fetch(config.API_URL + "/models", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        throw new Error("Network error");
    }

    const data = await response.json();
    return data.map((model: { name: string }) => model.name);
};
