import * as z from "zod";
import { ModelInput } from "./ModelInput";

const TextPanel = z.object({
    type: z.literal("text"),
    label: z.optional(z.string()),
    data: z.string(),
});

const JsonPanel = z.object({
    type: z.literal("json"),
    label: z.optional(z.string()),
    data: z.any(),
});

const ReactionPathsPanel = z.object({
    type: z.literal("reaction_paths"),
    label: z.optional(z.string()),
    common_paths: z.any(),
    stats: z.any(),
});

const TablePanel = z.object({
    type: z.literal("table"),
    label: z.optional(z.string()),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});

export const Panel = z.discriminatedUnion("type", [TextPanel, JsonPanel, ReactionPathsPanel, TablePanel]);
export type Panel = z.infer<typeof Panel>;

export const SimulationResults = z.object({
    status: z.enum(["done", "pending"]),
    modelInput: ModelInput,
    finalConcentrations: z.record(z.string(), z.number()),
    panels: z.array(Panel),
});
export type SimulationResults = z.infer<typeof SimulationResults>;
