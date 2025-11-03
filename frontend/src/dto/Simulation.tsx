import * as z from "zod";

export const Simulation = z.object({
    model: z.string(),
    id: z.number(),
    name: z.string(),
    owner: z.string(),
    scenarioInputs: z.object({
        initialConcentrations: z.record(z.string(), z.number()),
        parameters: z.record(z.string(), z.number()),
    }),
    date: z.date(),
});

export type Simulation = z.infer<typeof Simulation>;
