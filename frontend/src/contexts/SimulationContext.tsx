import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { runSimulation } from "../api/api";
import { SimulationResults } from "../dto/SimulationResults";

type SimulationResultsContextType = {
    simulationResults?: SimulationResults;
    setModelInput: (input: ModelInput) => void;
    loading: boolean;
};

type ModelInput = {
    concentrations: Record<string, number>;
    parameters: Record<string, number>;
    modelId: string;
};

const SimulationResultsContext = createContext<SimulationResultsContextType>(null as any);

export const SimulationResultsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modelInput, setModelInput] = useState<ModelInput | undefined>(undefined);
    const [simulationResults, setSimulationResults] = useState<SimulationResults | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchResults() {
            if (modelInput !== undefined) {
                setLoading(true);
                try {
                    setSimulationResults(
                        await runSimulation(modelInput.concentrations, modelInput.parameters, modelInput.modelId)
                    );
                } finally {
                    setLoading(false);
                }
            }
        }
        fetchResults();
    }, [modelInput]);

    return (
        <SimulationResultsContext.Provider value={{ simulationResults, setModelInput, loading }}>
            {children}
        </SimulationResultsContext.Provider>
    );
};

export const useSimulation = () => useContext(SimulationResultsContext);
