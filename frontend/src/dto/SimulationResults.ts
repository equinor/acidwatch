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

const Point = z.tuple([z.number(), z.number()]);

const StabilityDiagramPanel = z.object({
    type: z.literal("stability_diagram"),
    label: z.nullable(z.string()),
    x_label: z.nullable(z.string()),
    y_label: z.nullable(z.string()),
    regions: z.array(
        z.object({
            name: z.string(),
            points: z.array(Point),
            centroid: Point,
        })
    ),
});
export type StabilityDiagramPanel = z.infer<typeof StabilityDiagramPanel>;

const SinglePanel = z.discriminatedUnion("type", [
    TextPanel,
    JsonPanel,
    ReactionPathsPanel,
    TablePanel,
    StabilityDiagramPanel,
]);

const GroupPanel = z.object({
    type: z.literal("group"),
    label: z.nullable(z.string()),
    panels: z.array(SinglePanel),
});

export const Panel = z.discriminatedUnion("type", [...SinglePanel.options, GroupPanel]);
export type Panel = z.infer<typeof Panel>;

export const Phase = z.object({
    kind: z.enum(["aqueous", "co2-rich"]),
    fraction: z.number(),
    concentrations: z.record(z.string(), z.number()),
});
export type Phase = z.infer<typeof Phase>;

export const getCo2RichConcentrations = (phases: Phase[] = []): Record<string, number> =>
    phases.find((phase) => phase.kind === "co2-rich")?.concentrations ?? {};
export const SimulationResults = z.object({
    status: z.enum(["done", "pending", "processing", "error"]),
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
