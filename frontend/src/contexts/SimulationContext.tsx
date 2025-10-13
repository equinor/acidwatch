import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { startSimulation, getResultForSimulation } from "../api/api";
import { SimulationResults } from "../dto/SimulationResults";
import { ModelInput } from "../dto/ModelInput";
import { useQuery } from "@tanstack/react-query";
type SimulationResultsContextType = {
    simulationResults?: SimulationResults;
    setModelInput: (input: ModelInput) => void;
    loading: boolean;
    modelInput?: ModelInput;
};

const SimulationResultsContext = createContext<SimulationResultsContextType>(null as any);

export const SimulationResultsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modelInput, setModelInput] = useState<ModelInput | undefined>(undefined);
    const [simulationId, setSimulationId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchResults() {
            if (modelInput !== undefined) {
                setSimulationId(await startSimulation(modelInput));
            }
        }
        fetchResults();
    }, [modelInput]);

    const { data: simulationResults, isLoading: loading } = useQuery({
        queryKey: ["results", simulationId],
        queryFn: () => (simulationId ? getResultForSimulation(simulationId) : undefined),
        enabled: simulationId !== null,
    });

    return (
        <SimulationResultsContext.Provider
            value={{ simulationResults, setModelInput, loading, modelInput: modelInput }}
        >
            {children}
        </SimulationResultsContext.Provider>
    );
};

export const useSimulation = () => useContext(SimulationResultsContext);
