import { create } from "zustand";
import { Axis } from "@/dto/GridSimulation";

export const DEFAULT_GRID_STEP = 1;
const MIN_GRID_STEP = 0.001;

export interface GridRangeState {
    axes: Axis[];

    setAxes: (axes: Axis[]) => void;
    addAxis: (substance: string) => void;
    removeAxis: (index: number) => void;
    updateAxis: (index: number, axis: Partial<Axis>) => void;
    reset: (state?: { axes?: Axis[] }) => void;
}

export const clampStep = (value: number): number => Math.max(MIN_GRID_STEP, value || DEFAULT_GRID_STEP);

const DEFAULT_AXIS: Axis = {
    substance: "",
    range: { min: 0, max: 10, step: DEFAULT_GRID_STEP },
};

export const useGridRangeStore = create<GridRangeState>((set) => ({
    axes: [],

    setAxes: (axes) => set({ axes }),

    addAxis: (substance) =>
        set((state) => ({
            axes: [...state.axes, { ...DEFAULT_AXIS, substance }],
        })),

    removeAxis: (index) =>
        set((state) => ({
            axes: state.axes.filter((_, i) => i !== index),
        })),

    updateAxis: (index, partial) =>
        set((state) => ({
            axes: state.axes.map((axis, i) => {
                if (i !== index) return axis;
                const updated = { ...axis, ...partial };
                if (partial.range) {
                    updated.range = {
                        ...axis.range,
                        ...partial.range,
                        step: clampStep(partial.range.step ?? axis.range.step),
                    };
                }
                return updated;
            }),
        })),

    reset: (state) => set({ axes: state?.axes ?? [] }),
}));
