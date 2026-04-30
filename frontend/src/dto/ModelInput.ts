import * as z from "zod";

export const ModelInput = z.object({
    concentrations: z.record(z.string(), z.number()),
    temperature: z.nullable(z.number()).optional(),
    pressure: z.nullable(z.number()).optional(),
    models: z.array(
        z.object({
            parameters: z.record(z.string(), z.union([z.number(), z.string()])),
            modelId: z.string(),
        })
    ),
});

export type ModelInput = z.infer<typeof ModelInput>;
