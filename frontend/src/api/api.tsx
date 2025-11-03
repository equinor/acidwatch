import * as z from "zod";
import config from "@/configuration";
import { SimulationResults } from "@/dto/SimulationResults";
import { Project } from "@/dto/Project";
import { Simulation } from "@/dto/Simulation";
import { ModelConfig } from "@/dto/FormConfig";
import { ExperimentResult } from "@/dto/ExperimentResult";
import { getAccessToken } from "@/services/auth";
import { ModelInput } from "@/dto/ModelInput";

type ApiRequestInit<Model = never> = Omit<RequestInit, "method"> & {
    params?: Record<string, any>;
    json?: any;
} & (
        | { responseModel?: Model; responseReturn?: never }
        | { responseModel?: never; responseReturn?: true }
        | { responseModel?: never; responseReturn?: never }
    );

export class ResultIsPending extends Error {}

async function apiRequest(
    method: "GET" | "DELETE",
    path: string,
    init: Omit<ApiRequestInit, "body" | "json"> & { responseReturn: true }
): Promise<Response>;

async function apiRequest(
    method: "POST" | "PUT",
    path: string,
    init: ApiRequestInit & { responseReturn: true }
): Promise<Response>;

async function apiRequest<Model extends z.ZodTypeAny>(
    method: "GET" | "DELETE",
    path: string,
    init: Omit<ApiRequestInit<Model>, "body" | "json"> & { responseModel: Model }
): Promise<z.infer<Model>>;

async function apiRequest<Model extends z.ZodTypeAny>(
    method: "POST" | "PUT",
    path: string,
    init?: ApiRequestInit<Model> & { responseModel: Model }
): Promise<z.infer<Model>>;

async function apiRequest(
    method: "GET" | "DELETE",
    path: string,
    init?: Omit<ApiRequestInit, "body" | "json">
): Promise<void>;

async function apiRequest(method: "POST" | "PUT", path: string, init: ApiRequestInit): Promise<void>;

async function apiRequest<Model extends z.ZodTypeAny>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init: ApiRequestInit<Model> = {}
): Promise<any> {
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

    if (init.responseReturn) return response;

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    if (init.responseModel) {
        const json = await response.json();
        try {
            return await init.responseModel.parseAsync(json);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

export const startSimulation = async (modelInput: ModelInput): Promise<string> => {
    return await apiRequest("POST", `/models/${modelInput.modelId}/runs`, {
        json: {
            concentrations: modelInput.concentrations,
            parameters: modelInput.parameters,
        },
        responseModel: z.string(),
    });
};

export const getResultForSimulation = async (simulationId: string): Promise<SimulationResults> => {
    const data = await apiRequest("GET", `/simulations/${simulationId}/result`, { responseModel: SimulationResults });

    if (data.status === "pending") {
        throw new ResultIsPending();
    }

    return data;
};

export const getModels = async (): Promise<ModelConfig[]> => {
    return await apiRequest("GET", "/models", { responseModel: z.array(ModelConfig) });
};

export const saveProject = async (name: string, description: string, isPrivate: boolean): Promise<string> => {
    const data = await apiRequest("POST", "/project", {
        json: {
            name,
            description,
            private: isPrivate,
        },
        responseModel: z.object({ id: z.string() }),
    });
    return data.id;
};

export const getProjects = async (): Promise<Project[]> => {
    return await apiRequest("GET", "/projects", { responseModel: z.array(Project) });
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
    return await apiRequest("GET", `/project/${projectId}/scenario/${scenarioId}`, {
        responseModel: z.nullable(Simulation),
    });
};

export const getSimulations = async (projectId: string): Promise<Simulation[]> => {
    return await apiRequest("GET", `/project/${projectId}/scenarios`, { responseModel: z.array(Simulation) });
};

export const saveSimulation = async (
    projectId: string,
    result: SimulationResults | undefined,
    selectedModel: string,
    parameters: Record<string, number | string> | undefined,
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
    const response = await apiRequest("GET", `/project/${projectId}/scenario/${simulationId}/results`, {
        responseModel: z.array(SimulationResults),
    });
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

export async function getLabResults(): Promise<ExperimentResult[]> {
    return await apiRequest("GET", "/oasis", { responseModel: z.array(ExperimentResult) });
}
