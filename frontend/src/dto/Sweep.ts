import * as z from "zod";

export interface SweepRange {
    min: number;
    max: number;
    steps: number;
}

export interface CreateSweep {
    sweptSubstance: string;
    range: SweepRange;
    concentrations: Record<string, number>;
    conditions: {
        temperature: number;
        pressure: number;
    };
    models: {
        modelId: string;
        parameters: Record<string, number | string>;
    }[];
}

export const SweepPoint = z.object({
    value: z.number(),
    simulationId: z.uuid(),
    status: z.enum(["done", "pending", "error"]),
    error: z.nullable(z.string()),
    concentrations: z.record(z.string(), z.number()),
});
export type SweepPoint = z.infer<typeof SweepPoint>;

export const SweepResults = z.object({
    status: z.enum(["done", "pending"]),
    sweptSubstance: z.string(),
    values: z.array(z.number()),
    concentrations: z.record(z.string(), z.number()),
    conditions: z.object({
        temperature: z.number(),
        pressure: z.number(),
    }),
    models: z.array(
        z.object({
            modelId: z.string(),
            parameters: z.record(z.string(), z.union([z.number(), z.string()])),
        })
    ),
    points: z.array(SweepPoint),
});
export type SweepResults = z.infer<typeof SweepResults>;
