import { useQueries } from "@tanstack/react-query";
import { morland2019Acid } from "./morland2019acid";
import { oasis } from "./oasis";
import { smAmpp } from "./smAmpp";
import { Source } from "./types";
import { ExperimentResult } from "@/dto/ExperimentResult";
import React, { createElement, ReactNode, useContext, useState, createContext, useEffect } from "react";

const sources = {
    oasis,
    smAmpp,
    morland2019Acid,
} satisfies Record<string, Source>;

type SourcesContextType = {
    results: Record<string, ExperimentResult[] | Error>;
    combined: ExperimentResult[];
    sources: typeof sources;
    disabled: string[];
    toggleSource: (name: string) => void;
};

const SourcesContext = createContext<SourcesContextType>({
    results: {},
    combined: [],
    sources,
    disabled: [],
    toggleSource: () => {},
});

export const SourcesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [combined, setCombined] = useState<SourcesContextType["combined"]>([]);
    const [disabled, setDisabled] = useState<SourcesContextType["disabled"]>([]);

    const results: SourcesContextType["results"] = useQueries({
        queries: Object.entries(sources).map(([key, value]) => ({
            queryKey: ["lab-result-source", key],
            queryFn: async () => {
                try {
                    return [key, await value.get()];
                } catch (error) {
                    return [key, error];
                }
            },
        })),
        combine: (results) =>
            Object.fromEntries(results.filter((result) => result.isSuccess).map((result) => result.data)),
    });

    useEffect(() => {
        const combined = Object.entries(results)
            .filter(([name]) => !disabled.includes(name))
            .filter(([, value]) => Array.isArray(value))
            .flatMap(([, value]) => value as SourcesContextType["combined"]);
        setCombined(combined);
    }, [results, disabled]);

    const toggleSource = (name: string) => {
        const index = disabled.indexOf(name);
        if (index < 0) {
            setDisabled([...disabled, name]);
        } else {
            setDisabled(disabled.toSpliced(index, 1));
        }
    };

    const value: SourcesContextType = {
        disabled,
        results,
        combined,
        sources,
        toggleSource,
    };

    return createElement(SourcesContext.Provider, { value }, children);
};

export const useSources = () => useContext(SourcesContext);
