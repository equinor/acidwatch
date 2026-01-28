import * as z from "zod";
import { SimulationInput } from "./SimulationInput";

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

const results = z.object({
    concentrations: z.record(z.string(), z.number()),
    panels: z.array(Panel),
});

export const SimulationResults = z.object({
    status: z.enum(["done", "pending"]),
    input: SimulationInput,
    results: z.array(results).optional(),
});

export type SimulationResults = z.infer<typeof SimulationResults>;
