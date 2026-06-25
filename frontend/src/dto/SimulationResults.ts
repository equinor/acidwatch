import * as z from "zod";
import { ModelInput } from "./ModelInput";

const TextPanel = z.object({
    type: z.literal("text"),
    label: z.nullable(z.string()),
    data: z.string(),
});

const JsonPanel = z.object({
    type: z.literal("json"),
    label: z.nullable(z.string()),
    data: z.any(),
});

const ReactionPathsPanel = z.object({
    type: z.literal("reaction_paths"),
    label: z.nullable(z.string()),
    common_paths: z.any(),
    stats: z.any(),
});

const TablePanel = z.object({
    type: z.literal("table"),
    label: z.nullable(z.string()),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});

export const Panel = z.discriminatedUnion("type", [TextPanel, JsonPanel, ReactionPathsPanel, TablePanel]);
export type Panel = z.infer<typeof Panel>;

export const Phase = z.object({
    kind: z.enum(["aqueous", "co2-rich"]),
    fraction: z.number(),
    concentrations: z.record(z.string(), z.number()),
});
export type Phase = z.infer<typeof Phase>;

export const getCo2RichPhase = (phases: Phase[] = []): Phase | undefined =>
    phases.find((phase) => phase.kind === "co2-rich");

export const getCo2RichConcentrations = (phases: Phase[] = []): Record<string, number> =>
    getCo2RichPhase(phases)?.concentrations ?? {};

export const SimulationResults = z.object({
    status: z.enum(["done", "pending", "error"]),
    input: ModelInput,
    results: z.array(
        z.object({
            phases: z.array(Phase),
            panels: z.array(Panel),
        })
    ),
    error: z.nullable(z.string()).optional(),
});
export type SimulationResults = z.infer<typeof SimulationResults>;
