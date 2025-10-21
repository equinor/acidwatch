import { createContext, ReactNode, useContext, useState } from "react";

import { getResultForSimulation, ResultIsPending, startSimulation } from "../api/api";
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

    const { data: simulationId } = useQuery({
        queryKey: ["startSimluation", modelInput],
        queryFn: async () => startSimulation(modelInput!),
        enabled: modelInput !== undefined,
    });

    const { data: simulationResults, isLoading } = useQuery({
        queryKey: ["simulationResult", simulationId],
        queryFn: async () => getResultForSimulation(simulationId!),
        retry: (_failureCount, error) => error instanceof ResultIsPending,
        enabled: simulationId !== undefined,
    });

    return (
        <SimulationResultsContext.Provider
            value={{ simulationResults, setModelInput, loading: isLoading, modelInput: modelInput }}
        >
            {children}
        </SimulationResultsContext.Provider>
    );
};

export const useSimulation = () => useContext(SimulationResultsContext);
