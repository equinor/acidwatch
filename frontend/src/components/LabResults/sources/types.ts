import type { ExperimentResult } from "@/dto/ExperimentResult";

export type Source = {
    name: string;
    description?: string;
    get(): Promise<ExperimentResult[]>;
};
