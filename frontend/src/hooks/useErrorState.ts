// frontend/src/store/useErrorStore.ts
import { create } from "zustand";

interface ErrorState {
    error: string | null;
    setError: (error: string | null) => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
    error: null,
    setError: (error) => set({ error }),
}));
