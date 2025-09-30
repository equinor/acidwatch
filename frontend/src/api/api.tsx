import config from "../configuration";
import { SimulationResults } from "../dto/SimulationResults";
import { ModelConfig } from "../dto/FormConfig";
import { ExperimentResult } from "../dto/ExperimentResult";
import { getUserToken } from "../services/auth";
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
    const token = await getUserToken(config.OASIS_SCOPE);
    const response = await apiRequest(
        "GET",
        "/oasis/CO2LabResults",
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        true
    );

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
