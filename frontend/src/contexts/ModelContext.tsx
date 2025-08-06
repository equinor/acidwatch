import { createContext, ReactNode, useContext, useEffect } from "react";
import { ModelConfig } from "../dto/FormConfig";
import { getModels } from "../api/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { DefaultError } from "@tanstack/query-core";
import { useIsAuthenticated } from "@azure/msal-react";

type AvailableModelsContextType = {
    models: ModelConfig[];
    error: DefaultError | null;
    isLoading: boolean;
};

const AvailableModelsContext = createContext<AvailableModelsContextType>(null as any);

export const AvailableModelsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const isAuthenticated = useIsAuthenticated();
    const queryClient = useQueryClient();
    const {
        data: models,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["models"],
        queryFn: getModels,
        retry: false,
    });

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ["models"] });
    }, [isAuthenticated, queryClient]);

    return (
        <AvailableModelsContext.Provider value={{ models: models ?? [], error, isLoading }}>
            {children}
        </AvailableModelsContext.Provider>
    );
};

export const useAvailableModels = () => useContext(AvailableModelsContext);
