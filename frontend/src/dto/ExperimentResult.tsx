import * as z from "zod";

export const ExperimentResult = z.object({
    name: z.string(), // CDC-049-A
    initialConcentrations: z.record(z.string(), z.number()),
    finalConcentrations: z.record(z.string(), z.number()),
    pressure: z.nullable(z.number()),
    temperature: z.nullable(z.number()),
    time: z.nullable(z.number()), // elapsed experiment time in hours
});
export type ExperimentResult = z.infer<typeof ExperimentResult>;
