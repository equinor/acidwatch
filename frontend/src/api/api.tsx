import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";
import { Project } from "../dto/Project";
import { Simulation } from "../dto/Simulation";
import { ModelConfig } from "../dto/FormConfig";
import { ExperimentResult } from "../dto/ExperimentResult";
import { getUserToken } from "../services/auth";
import { getAccessToken } from "../services/auth";

export type concentrations = {
    [key: string]: number;
};

export const runSimulation = async (
    concentrations: Record<string, number>,
    parameters: Record<string, number>,
    modelId: string
): Promise<SimulationResults> => {
    const apiUrl = `${config.API_URL}/models/${modelId}/runs`;
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
                concs: concentrations,
                settings: parameters,
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

export const getModels = async (): Promise<ModelConfig[]> => {
    const token = await getAccessToken();
    const response = await fetch(config.API_URL + "/models", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    const token = await getAccessToken();
    console.log("Deleting project with id:", projectId);
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
    result: SimulationResults | undefined,
    selectedModel: string,
    parameters: Record<string, number> | undefined,
    simulationName: string
): Promise<any> => {
    const token = await getAccessToken();

    const body = JSON.stringify({
        name: simulationName,
        model: selectedModel,
        scenario_inputs: {
            initialConcentrations: result?.initialConcentrations ?? {},
            parameters: parameters,
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

export const saveResult = async (
    projectId: string,
    results: SimulationResults,
    simulationId: string
): Promise<void> => {
    const body = JSON.stringify(results);

    const token = await getAccessToken();
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

    const simulationResults: SimulationResults = data[0];

    return simulationResults;
};

export async function switchPublicity(projectId: string): Promise<any> {
    const url = `${config.API_URL}/project/${projectId}/switch_publicity`;
    const token = await getAccessToken();
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
        const experimentResult = item.data.labData.concentrations.entries.map((entry: any) => {
            const species = entry.species;

            const inputConcentrations = extractAndReplaceKeys("In_", "", species);
            const inputConcentrationsCapitalized = Object.fromEntries(
                Object.entries(inputConcentrations).map(([key, value]) => [key.toUpperCase(), value])
            );
            const outputConcentrations = extractAndReplaceKeys("Out_", "", species);
            const outputConcentrationsCapitalized = Object.fromEntries(
                Object.entries(outputConcentrations).map(([key, value]) => [key.toUpperCase(), value])
            );
            const experimentResult: ExperimentResult = {
                name: item.data.general.name + "-" + entry.step,
                initialConcentrations: inputConcentrationsCapitalized,
                finalConcentrations: outputConcentrationsCapitalized,
                pressure: item.data.general.pressure ?? null,
                temperature: item.data.general.temperature ?? null,
                time: entry.time ?? null,
            };
            return experimentResult;
        });

        return experimentResult;
    });

    return experimentResults;
};
export async function getLabResults(): Promise<ExperimentResult[]> {
    const token = await getUserToken(config.OASIS_SCOPE);
    const response = await fetch("/oasis/CO2LabResults", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Unauthorized: Apply for access to CO2 lab results in AccessIT");
        } else if (response.status === 403) {
            throw new Error(
                "You do not have permission to access this resource. Apply for access to CO2 lab results in AccessIT"
            );
        } else {
            throw new Error("Network response was not ok");
        }
    }
    const data = await response.json();

    const transformedData = processData(data);
    return transformedData;
}
