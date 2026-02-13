import { create } from "zustand";

const DEFAULTS = {
    O2: 30,
    H2O: 30,
    H2S: 0,
    SO2: 10,
    NO2: 20,
};

export interface ConcentrationsState {
    concentrations: Record<string, number>;
    setConcentration: (substance: string, value: number) => void;
    reset: (concentrations?: Record<string, number>) => void;
}

export const useConcentrationsStore = create<ConcentrationsState>((set) => ({
    concentrations: { ...DEFAULTS },

    setConcentration: (substance, value) =>
        set((s) => ({ concentrations: { ...s.concentrations, [substance]: value } })),

    reset: (concentrations) =>
        set({
            concentrations: concentrations ?? { ...DEFAULTS },
        }),
}));
