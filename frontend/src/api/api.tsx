import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";
import { Project } from "../dto/Project";
import { Simulation } from "../dto/Simulation";
import { ModelConfig } from "../dto/FormConfig";
import { getUserToken } from "../services/auth";
import { ExperimentResult } from "../dto/ExperimentResult";
import { getCurrentDate } from "../functions/Formatting";

export type concentrations = {
    [key: string]: number;
};

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

    // Set up timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500 * 1000);

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                concs: absoluteConcentrations,
                settings: settings,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error("Network error");
        }

        return response.json();
    } catch (error) {
        if ((error as Error).name === "AbortError") {
            throw new Error("Request timed out");
        }
        throw error;
    }
};

export const getModels = async (): Promise<Record<string, ModelConfig>> => {
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

    return data;
};

export const saveProject = async (name: string, description: string, isPrivate: boolean): Promise<string> => {
    const token = await getAccessToken();
    const response = await fetch(config.API_URL + "/project", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
            name,
            description,
            private: isPrivate,
            date: getCurrentDate(),
        }),
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data.id;
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

export const deleteProject = async (projectId: string) => {
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
    simulationName: string,
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
        date: getCurrentDate(),
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

export const saveResult = async (
    projectId: string,
    results: SimulationResults,
    simulationId: string
): Promise<void> => {
    const token = await getAccessToken();

    const body = JSON.stringify({
        scenario_id: simulationId,
        raw_results: JSON.stringify(results),
    });
    console.log("Saving results", body);
    const response = await fetch(`${config.API_URL}/project/${projectId}/scenario/${simulationId}/result`, {
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
};

export const getSimulationResults = async (projectId: string, simulationId: string): Promise<SimulationResults> => {
    const token = await getAccessToken();
    const response = await fetch(`${config.API_URL}/project/${projectId}/scenario/${simulationId}/results`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    const simulationResults: SimulationResults = JSON.parse(data[0].raw_results);

    return simulationResults;
};

export async function switchPublicity(projectId: string): Promise<any> {
    const token = await getAccessToken();
    const url = `${config.API_URL}/project/${projectId}/switch_publicity`;

    console.log("Switching project publicity:", projectId);
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        });

        if (!response.ok) {
            throw new Error(`Error updating project: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error updating project:", error);
        throw error;
    }
}

export const extractAndReplaceKeys = (pattern: string, replacement: string, dictionary: Record<string, any>) => {
    return Object.keys(dictionary)
        .filter((key) => key.startsWith(pattern))
        .reduce<Record<string, number>>((acc, key) => {
            acc[key.replace(pattern, replacement)] = dictionary[key];
            return acc;
        }, {});
};

const processData = (response: any): ExperimentResult[] => {
    const experimentResults: ExperimentResult[] = response.flatMap((item: any) => {
        const experimentResult = item.data.inputConcentrations.listInputConcentrations.entries.map((entry: any) => {
            const species = entry.species;

            const inputConcentrations = extractAndReplaceKeys("In_", "", species);
            const outputConcentrations = extractAndReplaceKeys("Out_", "", species);
            const experimentResult: ExperimentResult = {
                name: item.data.general.name,
                initial_concentrations: inputConcentrations,
                final_concentrations: outputConcentrations,
                pressure: entry.pressure ?? null,
                temperature: entry.temperature ?? null,
                time: entry.time ?? null,
            };
            return experimentResult;
        });

        return experimentResult;
    });

    return experimentResults;
};
export async function getLabResults(): Promise<ExperimentResult[]> {
    const scope = "d2e2c318-b49a-4174-b4b4-256751558dc5/user_impersonation";
    const token = await getUserToken(scope);
    const response = await fetch("/oasis/CO2LabResults", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const data = await response.json();

    const transformedData = processData(data);
    return transformedData;
}
