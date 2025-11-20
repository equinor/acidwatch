import { createContext, createElement, FC, ReactNode, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "simulationHistory";

export interface SimulationHistoryItem {
    simulationId: string;
    displayName: string;
    date: Date;
}

type SimulationHistoryContextType = {
    history: SimulationHistoryItem[];
    addSimulation: (simulationId: string, displayName: string) => void;
};

const SimulationHistoryContext = createContext<SimulationHistoryContextType>(null as any);

const getSimulationHistory = (): SimulationHistoryItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((item: any) => ({
            ...item,
            date: new Date(item.date),
        }));
    } catch {
        return [];
    }
};

const saveSimulationHistory = (history: SimulationHistoryItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const SimulationHistoryProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [history, setHistory] = useState<SimulationHistoryItem[]>([]);

    useEffect(() => {
        setHistory(getSimulationHistory());
    }, []);

    const addSimulation = useCallback((simulationId: string, displayName: string) => {
        const newItem: SimulationHistoryItem = {
            simulationId,
            displayName,
            date: new Date(),
        };

        setHistory((prevHistory) => {
            // Add to beginning of array (most recent first)
            const updatedHistory = [newItem, ...prevHistory.filter((item) => item.simulationId !== simulationId)];

            // Keep only the last 10 simulations
            const limitedHistory = updatedHistory.slice(0, 10);

            saveSimulationHistory(limitedHistory);
            return limitedHistory;
        });
    }, []);

    return createElement(
        SimulationHistoryContext.Provider,
        { value: { history, addSimulation } },
        children
    );
};

export const useSimulationHistory = () => useContext(SimulationHistoryContext);
