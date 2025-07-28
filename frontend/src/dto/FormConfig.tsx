export interface InputConfig {
    max?: number | undefined;
    min?: number | undefined;
    defaultvalue: number;
    meta?: string;
    type: string;
    input_type: string;
    values?: number[];
    range?: number[];
    enabled: boolean;
}

export interface FormConfig {
    unavailable?: string;
    settings: Record<string, InputConfig>;
    inputConcentrations: Record<string, InputConfig>;
}

export interface ParameterConfig {
    default: number;
    label?: string;
    description?: string;
    unit?: string;
    custom_unit?: string;
    minimum?: number;
    maximum?: number;
    choices?: string[];
}

export interface ModelConfig {
    accessError?: string;
    modelId: string;
    displayName: string;
    validSubstances: string[];
    parameters: Record<string, ParameterConfig>;
}
