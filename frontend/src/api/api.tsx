import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";
import { Project } from "../dto/Project";
import { Simulation } from "../dto/Simulation";

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

export const getProjects = async (): Promise<Project[]> => {
    const token = await getAccessToken();

    const response = await fetch(config.API_URL + "/projects", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data: Project[] = await response.json();
    return data;
};

export const deleteProject = async (projectId: number) => {
    console.log("Deleting project with id:", projectId);
    const token = await getAccessToken();
    try {
        const response = await fetch(config.API_URL + "/project/" + projectId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
    } catch (error) {
        console.error("Error deleting project:", error);
    }
};

export const getSimulations = async (projectId: string): Promise<Simulation[]> => {
    const token = await getAccessToken();
    const response = await fetch(config.API_URL + "/project/" + projectId + "/scenarios", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data: Simulation[] = await response.json();
    return data;
};
export interface SimulationInput {
    key: string;
    defaultvalue: number;
}

export const saveSimulation = async (
    projectId: string,
    formConfig: any,
    selectedModel: string,
    simulationName: string
): Promise<any> => {
    const token = await getAccessToken();

    const concs: { [key: string]: number } = Object.keys(formConfig.inputConcentrations).reduce(
        (acc, key) => {
            acc[key] = formConfig.inputConcentrations[key].defaultvalue;
            return acc;
        },
        {} as { [key: string]: number }
    );

    const settings: { [key: string]: number } = Object.keys(formConfig.settings).reduce(
        (acc, key) => {
            acc[key] = formConfig.settings[key].defaultvalue;
            return acc;
        },
        {} as { [key: string]: number }
    );

    const body = JSON.stringify({
        name: simulationName,
        model: selectedModel,
        scenario_inputs: {
            concs,
            settings,
        },
    });

    const response = await fetch(config.API_URL + "/project/" + projectId + "/scenario", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: body,
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data;
};
export const deleteSimulation = async (projectId: string, simulationId: number): Promise<void> => {
    const token = await getAccessToken();
    const response = await fetch(`${config.API_URL}/project/${projectId}/scenario/${simulationId}`, {
        method: "DELETE",
        headers: {
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
};

export const saveResults = async (
    projectId: string,
    simulationId: number,
    results: SimulationResults
): Promise<void> => {
    const token = await getAccessToken();
    const response = await fetch(`${config.API_URL}/project/${projectId}/${simulationId}/result`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify(results),
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
};
