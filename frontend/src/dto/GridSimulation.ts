import * as z from "zod";
import { SimulationResults } from "./SimulationResults";

export const AxisRange = z.object({
    min: z.number(),
    max: z.number(),
    steps: z.number(),
});
export type AxisRange = z.infer<typeof AxisRange>;

export const Axis = z.object({
    substance: z.string(),
    range: AxisRange,
});
export type Axis = z.infer<typeof Axis>;

export interface CreateGridSimulation {
    axes: Axis[];
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

export const GridSimulationResult = z.object({
    status: z.enum(["done", "pending"]),
    axes: z.array(Axis),
    simulations: z.array(SimulationResults),
});
export type GridSimulationResult = z.infer<typeof GridSimulationResult>;
