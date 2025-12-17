import * as z from "zod";
import config from "@/configuration";
import { SimulationResults } from "@/dto/SimulationResults";
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

export async function getLabResults(): Promise<ExperimentResult[]> {
    return await apiRequest("GET", "/oasis", { responseModel: z.array(ExperimentResult) });
}
