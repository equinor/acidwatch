import * as z from "zod";

const ModelInput = z.object({
    parameters: z.record(z.string(), z.union([z.number(), z.string()])),
    modelId: z.string(),
});

export const SimulationInput = z.object({
    concentrations: z.record(z.string(), z.number()),
    models: z.array(ModelInput),
});

export type ModelInput = z.infer<typeof ModelInput>;
export type SimulationInput = z.infer<typeof SimulationInput>;
