import { createContext, ReactNode, useContext } from "react";
import { ModelConfig } from "../dto/FormConfig";
import { getModels } from "../api/api";
import { useQuery } from "@tanstack/react-query";

import { DefaultError } from "@tanstack/query-core";

type AvailableModelsContextType = {
    models: ModelConfig[];
    error: DefaultError | null;
    isLoading: boolean;
};

const AvailableModelsContext = createContext<AvailableModelsContextType>(null as any);

export const AvailableModelsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        data: models,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["models"],
        queryFn: getModels,
        retry: false,
    });

    return (
        <AvailableModelsContext.Provider value={{ models: models ?? [], error, isLoading }}>
            {children}
        </AvailableModelsContext.Provider>
    );
};

export const useAvailableModels = () => useContext(AvailableModelsContext);
