import { create } from "zustand";

interface BreadcrumbState {
    projectName: string | null;
    simulationName: string | null;
    setProject: (name: string | null) => void;
    setSimulation: (name: string | null) => void;
    clearAll: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
    projectName: null,
    simulationName: null,
    setProject: (name) => set({ projectName: name }),
    setSimulation: (name) => set({ simulationName: name }),
    clearAll: () =>
        set({
            projectName: null,
            simulationName: null,
        }),
}));
