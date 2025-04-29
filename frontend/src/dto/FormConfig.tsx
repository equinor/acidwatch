export interface InputConfig {
    max?: number | undefined;
    min?: | number | undefined;
    defaultvalue: number;
    meta?: string;
    type: string;
    input_type: string;
    values?: number[];
    range?: number[];
    enabled: boolean;
}

export interface FormConfig {
    settings: Record<string, InputConfig>;
    inputConcentrations: Record<string, InputConfig>;
}

export interface ModelConfig {
    formconfig: FormConfig;
}
