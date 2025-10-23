interface ParameterConfig {
    default: number;
    label?: string;
    description?: string;
    unit?: string;
    convertibleUnit?: string;
    minimum?: number;
    maximum?: number;
    choices?: string[];
    optionLabels?: string[];
}

export interface ModelConfig {
    accessError?: string;
    modelId: string;
    version?: string;
    displayName: string;
    validSubstances: string[];
    parameters: Record<string, ParameterConfig>;
    description: string;
    category: string;
}
