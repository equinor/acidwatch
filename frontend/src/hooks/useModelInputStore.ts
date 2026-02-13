import { create, useStore, StoreApi } from "zustand";
import { ModelConfig } from "@/dto/FormConfig.tsx";

function getParameterDefaults(model: ModelConfig) {
    return Object.fromEntries(Object.entries(model.parameters).map(([key, value]) => [key, value.default]));
}

export interface ModelInputState {
    parameters: Record<string, any>;

    setParameter: (name: string, value: any) => void;
    reset: (state?: { parameters: Record<string, any> }) => void;
}

const createModelInputStore = (modelConfig: ModelConfig) =>
    create<ModelInputState>((set) => ({
        parameters: getParameterDefaults(modelConfig),

        setParameter: (name, value) => set((s) => ({ parameters: { ...s.parameters, [name]: value } })),

        reset: (state) =>
            set(
                state ?? {
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
        setParameter: state.setParameter,
        reset: state.reset,
    };
};
