import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";
import { Project } from "../dto/Project";
import { Simulation } from "../dto/Simulation";
import { ModelConfig } from "../dto/FormConfig";
import { ExperimentResult } from "../dto/ExperimentResult";
import { getAccessToken } from "../services/auth";
import { ModelInput } from "../dto/ModelInput";

type ApiRequestInit = Omit<RequestInit, "method"> & { params?: Record<string, any>; json?: any };

async function apiRequest(
    method: "GET" | "DELETE",
    path: string,
    init: Omit<ApiRequestInit, "body" | "json">,
    returnResponse: true
): Promise<Response>;

async function apiRequest(
    method: "POST" | "PUT",
    path: string,
    init: ApiRequestInit,
    returnResponse: true
): Promise<Response>;

async function apiRequest<T = any>(
    method: "GET" | "DELETE",
    path: string,
    init?: Omit<ApiRequestInit, "body" | "json">,
    returnResponse?: false | undefined
): Promise<T>;

async function apiRequest<T = any>(
    method: "POST" | "PUT",
    path: string,
    init?: ApiRequestInit,
    returnResponse?: false | undefined
): Promise<T>;

async function apiRequest<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init: ApiRequestInit = {},
    returnResponse: boolean = false
): Promise<T> {
    const token = await getAccessToken();
    const url = new URL(path, config.API_URL);

    if (init.params !== undefined) {
        Object.entries(init.params).forEach(([name, value]) => url.searchParams.append(name, value));
    }

    const body = init.body ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
    };

    const response = await fetch(url, {
        ...init,
        body,
        headers,
        method,
    });

    if (returnResponse) return response as T;

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return (await response.json()) as T;
}

export const runSimulation = async (modelInput: ModelInput): Promise<SimulationResults> => {
    // Set up timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500 * 1000);

    try {
        const response = await apiRequest(
            "POST",
            `/models/${modelInput.modelId}/runs`,
            {
                json: {
                    concentrations: modelInput.concentrations,
                    parameters: modelInput.parameters,
                },
                signal: controller.signal,
            },
            true
        );

        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error("Network error");
        }

        const result = await response.json();

        return {
            modelInput: modelInput,
            finalConcentrations: result.finalConcentrations,
            panels: result.panels,
        };
    } catch (error) {
        if ((error as Error).name === "AbortError") {
            throw new Error("Request timed out");
        }
        throw error;
    }
};

export const getModels = async (): Promise<ModelConfig[]> => {
    return await apiRequest<ModelConfig[]>("GET", "/models");
};

export const saveProject = async (name: string, description: string, isPrivate: boolean): Promise<string> => {
    const data = await apiRequest<{ id: string }>("POST", "/project", {
        json: {
            name,
            description,
            private: isPrivate,
        },
    });
    return data.id;
};

export const getProjects = async (): Promise<Project[]> => {
    return await apiRequest<Project[]>("GET", "/projects");
};

export const deleteProject = async (projectId: string) => {
    console.log("Deleting project with id:", projectId);
    try {
        await apiRequest("DELETE", `/project/${projectId}`);
    } catch (error) {
        console.error("Error deleting project:", error);
    }
};
export const getSimulation = async (projectId: string, scenarioId: string): Promise<Simulation | null> => {
    return await apiRequest<Simulation | null>("GET", `/project/${projectId}/scenario/${scenarioId}`);
};

export const getSimulations = async (projectId: string): Promise<Simulation[]> => {
    return await apiRequest<Simulation[]>("GET", `/project/${projectId}/scenarios`);
};

export const saveSimulation = async (
    projectId: string,
    result: SimulationResults | undefined,
    selectedModel: string,
    parameters: Record<string, number> | undefined,
    simulationName: string
): Promise<any> => {
    return await apiRequest("POST", `/project/${projectId}/scenario`, {
        json: {
            name: simulationName,
            model: selectedModel,
            scenario_inputs: {
                initialConcentrations: result?.modelInput.concentrations ?? {},
                parameters: parameters,
            },
        },
    });
};
export const deleteSimulation = async (projectId: string, simulationId: number): Promise<void> => {
    await apiRequest("DELETE", `/project/${projectId}/scenario/${simulationId}`);
};

export const saveResult = async (
    projectId: string,
    results: SimulationResults,
    simulationId: string
): Promise<void> => {
    await apiRequest("POST", `/project/${projectId}/scenario/${simulationId}/result`, {
        json: results,
    });
};

export const getSimulationResults = async (projectId: string, simulationId: string): Promise<SimulationResults> => {
    const response = await apiRequest<SimulationResults[]>(
        "GET",
        `/project/${projectId}/scenario/${simulationId}/results`
    );
    return response[0];
};

export async function switchPublicity(projectId: string): Promise<any> {
    console.log("Switching project publicity:", projectId);
    try {
        return await apiRequest("PUT", `/project/${projectId}/switch_publicity`);
    } catch (error) {
        console.error("Error updating project:", error);
        throw error;
    }
}

export const getKeyValuesFromPrefix = (pattern: string, dict: Record<string, any>) =>
    Object.fromEntries(
        Object.keys(dict)
            .filter((key) => key.startsWith(pattern))
            .map((key) => [key.slice(pattern.length).toUpperCase(), dict[key]])
    );

const formatLabData = (response: any): ExperimentResult[] =>
    response.flatMap((item: any) =>
        item.data.labData.concentrations.entries.map((entry: any) => ({
            name: `${item.data.general.name}-${entry.step}`,
            initialConcentrations: getKeyValuesFromPrefix("In_", entry.species),
            finalConcentrations: getKeyValuesFromPrefix("Out_", entry.species),
            pressure: entry.pressure ?? null,
            temperature: entry.temperature ?? null,
            time: entry.time ?? null,
        }))
    );

export async function getLabResults(): Promise<ExperimentResult[]> {
    const data = await apiRequest<any[]>("GET", "/oasis");
    return formatLabData(data);
}
