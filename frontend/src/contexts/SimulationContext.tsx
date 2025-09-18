import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { runSimulation } from "../api/api";
import { SimulationResults } from "../dto/SimulationResults";
import { ModelInput } from "../dto/ModelInput";
type SimulationResultsContextType = {
    simulationResults?: SimulationResults;
    setModelInput: (input: ModelInput) => void;
    loading: boolean;
    modelInput?: ModelInput;
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
                setSimulationResults(undefined);
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
        <SimulationResultsContext.Provider
            value={{ simulationResults, setModelInput, loading, modelInput: modelInput }}
        >
            {children}
        </SimulationResultsContext.Provider>
    );
};

export const useSimulation = () => useContext(SimulationResultsContext);
