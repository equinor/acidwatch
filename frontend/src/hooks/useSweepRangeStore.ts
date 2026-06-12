import { create } from "zustand";

export const DEFAULT_SWEEP_STEPS = 10;
const MIN_SWEEP_STEPS = 2;
const MAX_SWEEP_STEPS = 25;

export interface SweepRangeState {
    sweptSubstance: string | null;
    min: number;
    max: number;
    steps: number;

    setSweptSubstance: (substance: string | null) => void;
    setMin: (value: number) => void;
    setMax: (value: number) => void;
    setSteps: (value: number) => void;
    reset: (state?: Partial<Omit<SweepRangeState, keyof SweepRangeActions>>) => void;
}

type SweepRangeActions = {
    setSweptSubstance: SweepRangeState["setSweptSubstance"];
    setMin: SweepRangeState["setMin"];
    setMax: SweepRangeState["setMax"];
    setSteps: SweepRangeState["setSteps"];
    reset: SweepRangeState["reset"];
};

const DEFAULTS = {
    sweptSubstance: null as string | null,
    min: 0,
    max: 100,
    steps: DEFAULT_SWEEP_STEPS,
};

export const clampSteps = (value: number): number =>
    Math.max(MIN_SWEEP_STEPS, Math.min(MAX_SWEEP_STEPS, Math.round(value || DEFAULT_SWEEP_STEPS)));

export const useSweepRangeStore = create<SweepRangeState>((set) => ({
    ...DEFAULTS,

    setSweptSubstance: (substance) => set({ sweptSubstance: substance }),
    setMin: (value) => set({ min: value }),
    setMax: (value) => set({ max: value }),
    setSteps: (value) => set({ steps: clampSteps(value) }),

    reset: (state) => set({ ...DEFAULTS, ...state }),
}));
