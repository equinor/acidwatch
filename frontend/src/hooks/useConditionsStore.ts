import { create } from "zustand";

export interface ConditionsState {
    temperature: number;
    pressure: number;
    setTemperature: (value: number) => void;
    setPressure: (value: number) => void;
    reset: (state?: { temperature?: number | null; pressure?: number | null }) => void;
}

const DEFAULTS = { temperature: 298, pressure: 100 };

export const useConditionsStore = create<ConditionsState>((set) => ({
    ...DEFAULTS,

    setTemperature: (temperature) => set({ temperature }),
    setPressure: (pressure) => set({ pressure }),

    reset: (state) =>
        set({
            temperature: state?.temperature ?? DEFAULTS.temperature,
            pressure: state?.pressure ?? DEFAULTS.pressure,
        }),
}));
