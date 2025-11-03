import * as z from "zod";

const ParameterConfig = z.object({
    default: z.union([z.string(), z.number()]),
    label: z.optional(z.string()),
    description: z.optional(z.string()),
    unit: z.optional(z.string()),
    convertibleUnit: z.optional(z.string()),
    minimum: z.optional(z.number()),
    maximum: z.optional(z.number()),
    choices: z.optional(z.array(z.string())),
    optionLabels: z.optional(z.array(z.string())),
});

export const ModelConfig = z.object({
    accessError: z.nullable(z.string()),
    modelId: z.string(),
    displayName: z.string(),
    validSubstances: z.array(z.string()),
    parameters: z.record(z.string(), ParameterConfig),
    description: z.string(),
    category: z.string(),
});
export type ModelConfig = z.infer<typeof ModelConfig>;
