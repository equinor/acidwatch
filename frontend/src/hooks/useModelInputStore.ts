import { create, useStore, StoreApi } from "zustand";
import { ModelConfig } from "@/dto/FormConfig.tsx";

const DEFAULTS = {
    O2: 30,
    H2O: 30,
    H2S: 0,
    SO2: 10,
    NO2: 20,
};

function getConcentrationDefaults(model: ModelConfig) {
    return Object.fromEntries(Object.entries(DEFAULTS).filter(([name]) => model.validSubstances.includes(name)));
}

function getParameterDefaults(model: ModelConfig) {
    return Object.fromEntries(Object.entries(model.parameters).map(([key, value]) => [key, value.default]));
}

export interface ModelInputState {
    concentrations: Record<string, number>;
    parameters: Record<string, any>;

    setConcentration: (substance: string, value: number) => void;
    setParameter: (name: string, value: any) => void;
    reset: (state?: { concentrations: Record<string, number>; parameters: Record<string, any> }) => void;
}

const createModelInputStore = (modelConfig: ModelConfig) =>
    create<ModelInputState>((set) => ({
        concentrations: getConcentrationDefaults(modelConfig),
        parameters: getParameterDefaults(modelConfig),

        setConcentration: (substance, value) =>
            set((s) => ({ concentrations: { ...s.concentrations, [substance]: value } })),

        setParameter: (name, value) => set((s) => ({ parameters: { ...s.parameters, [name]: value } })),

        reset: (state) =>
            set(
                state ?? {
                    concentrations: getConcentrationDefaults(modelConfig),
                    parameters: getParameterDefaults(modelConfig),
                }
            ),
    }));

const modelStores = new Map<string, StoreApi<ModelInputState>>();

export const getModelInputStore = (model: ModelConfig): StoreApi<ModelInputState> => {
    if (!modelStores.has(model.modelId)) {
        modelStores.set(model.modelId, createModelInputStore(model));
    }
    return modelStores.get(model.modelId)!;
};

export const useModelInputStore = <T>(model: ModelConfig, selector: (state: ModelInputState) => T): T => {
    const store = getModelInputStore(model);
    return useStore(store, selector);
};

export const useModelInputActions = (model: ModelConfig) => {
    const store = getModelInputStore(model);
    const state = store.getState();
    return {
        setConcentration: state.setConcentration,
        setParameter: state.setParameter,
        reset: state.reset,
    };
};
