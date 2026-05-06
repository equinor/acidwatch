import { create } from "zustand";
import { Conditions } from "@/dto/ModelInput";

const DEFAULTS: Conditions = {
    temperature: 300,
    pressure: 10,
};

export interface ConditionsState {
    conditions: Conditions;
    setCondition: (key: keyof Conditions, value: number) => void;
    reset: (conditions?: Conditions) => void;
}

export const useConditionsStore = create<ConditionsState>((set) => ({
    conditions: { ...DEFAULTS },

    setCondition: (key, value) => set((s) => ({ conditions: { ...s.conditions, [key]: value } })),

    reset: (conditions) =>
        set({
            conditions: conditions ?? { ...DEFAULTS },
        }),
}));
