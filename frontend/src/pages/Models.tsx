import React, { useState } from "react";
import { create } from "zustand";
import styled from "styled-components";
import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Autocomplete, Banner, Button, Input, Label, Radio, TextField, Typography } from "@equinor/eds-core-react";
import InputForm from "./InputForm";
import { SimulationResults } from "../dto/SimulationResults";
import { runSimulation } from "../api/api";
import Results from "./Results";

const UnstyledList = styled.ul`
    margin: 0;
    padding: 0;
    list-style-type: none;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 720px;
`;

const DEFAULT_CONCENTRATIONS: Record<string, number> = {
    O2: 30,
    H2O: 0.5,
    H2S: 0,
    SO2: 10,
    NO2: 20,

    H2SO4: 2,
};

type AnyParameters = { [key: string]: number };

interface ParameterSchema {
    type: "integer";
    name: string;
    label: string;
    default: number;
    description?: string;
    minimum?: number;
    maximum?: number;
    unit?: string;
    customUnit?: string;
}

interface ModelInfo {
    accessError: string | null;
    modelId: string;
    displayName: string;
    validSubstances: string[];
    parameters: Record<string, ParameterSchema>;
}

const useModels: () => UseQueryResult<ModelInfo[]> = () => {
    return useQuery({
        queryKey: ["model"],
        queryFn: async () => {
            const token = await getAccessToken();
            const response = await fetch(config.API_URL + "/models", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            return await response.json();
        },
        retry: false,
    });
};

const ModelSettings: React.FC<{ model: ModelInfo; selectedModel?: string; setModel: (id: string) => void }> = ({
    model,
    selectedModel,
    setModel,
}) => {
    return (
        <li>
            <Radio
                label={model.displayName}
                checked={model.modelId === selectedModel}
                onChange={() => setModel(model.modelId)}
            />
        </li>
    );
};

const ModelSelect: React.FC<{ onModelChange: (model: ModelInfo) => void }> = ({ onModelChange }) => {
    const { data, isLoading, error } = useModels();
    const [selectedModel, setModel] = useState<string | undefined>(undefined);

    if (isLoading) {
        return <>Loading models</>;
    } else if (error !== null) {
        console.error(error);
        return <>Error!</>;
    } else if (data === undefined) {
        console.log("Data is undefined");
        return <>Error!</>;
    }

    const onSetModel = (modelId: string) => {
        if (selectedModel === modelId) return;

        setModel(modelId);
        for (const model of data) {
            if (model.modelId === modelId) {
                onModelChange(model);
                break;
            }
        }
    };

    return (
        <fieldset>
            <legend>Model</legend>
            <UnstyledList>
                {data.map((model) => (
                    <ModelSettings
                        key={model.modelId}
                        model={model}
                        setModel={onSetModel}
                        selectedModel={selectedModel}
                    />
                ))}
            </UnstyledList>
        </fieldset>
    );
};

const ModelParameterInput: React.FC<{
    name: string;
    schema: ParameterSchema;
    value: number;
    onChange: (name: string, value: number) => void;
    disabled?: boolean;
}> = ({ name, schema, value, onChange, disabled }) => {
    return (
        <>
            <TextField
                type="number"
                label={schema.label}
                min={schema.minimum}
                max={schema.maximum}
                unit={schema.unit ?? schema.customUnit}
                value={value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(name, event.target.valueAsNumber);
                }}
                disabled={disabled}
            />
        </>
    );
};

const ModelParameters: React.FC<{
    model: ModelInfo;
    parameters: AnyParameters;
    onChange: (state: AnyParameters) => void;
    disabled?: boolean;
}> = ({ model, parameters, onChange, disabled }) => {
    const handleChange = (name: string, value: number) => {
        onChange({
            ...parameters,
            [name]: value,
        });
    };

    return (
        <fieldset>
            <legend>Parameters</legend>
            {Object.entries(model.parameters).map(([name, schema]) => (
                <ModelParameterInput
                    name={name}
                    schema={schema}
                    value={parameters[name]}
                    onChange={handleChange}
                    disabled={disabled}
                />
            ))}
        </fieldset>
    );
};

const ModelConcentrations: React.FC<{
    model: ModelInfo;
    concentrations: Record<string, number | null>;
    disabled?: boolean;
}> = ({ model, concentrations, disabled }) => {
    const activeEntries = Object.entries(concentrations).map(([name, value]) => {
        return <TextField type="number" label={name} value={value} unit="ppm" disabled={disabled} />;
    });
    const inactiveOptions = model.validSubstances.filter((name) => {
        return concentrations[name] === undefined;
    });

    return (
        <fieldset>
            <legend>Concentrations</legend>
            {activeEntries}
            <Autocomplete label="Disabled" options={inactiveOptions} disabled={disabled} />
        </fieldset>
    );
};

const ModelsInputSelect: React.FC<{
    onSubmit: (model: ModelInfo, concs: Record<string, number>, params: Record<string, any>) => void;
}> = ({ onSubmit }) => {
    const [model, setModelInfo] = useState<ModelInfo | undefined>(undefined);
    const [parameters, setParameters] = useState<{ [key: string]: number }>({});
    const [concentrations, setConcentrations] = useState<{ [key: string]: number }>({});

    const setModel = (model: ModelInfo) => {
        setParameters(
            Object.fromEntries(
                Object.entries(model.parameters).map(([name, schema]) => {
                    return [name, schema.default];
                })
            )
        );

        setConcentrations(
            Object.fromEntries(
                model.validSubstances
                    .map((name) => [name, DEFAULT_CONCENTRATIONS[name] ?? 0])
                    .filter(([name, conc]) => conc !== undefined)
            )
        );

        setModelInfo(model);
    };

    const modelSelect = <ModelSelect onModelChange={setModel} />;

    if (model === undefined) {
        return <Column>{modelSelect}</Column>;
    }

    let accessError = null;
    if (model.accessError !== null) {
        accessError = (
            <Banner>
                <Banner.Message color="danger">{model.accessError}</Banner.Message>
            </Banner>
        );
    }

    console.log(model);

    return (
        <Column>
            {modelSelect}
            {accessError}
            <ModelConcentrations model={model} concentrations={concentrations} disabled={accessError !== null} />
            {true ? (
                <ModelParameters
                    model={model}
                    parameters={parameters}
                    onChange={() => {}}
                    disabled={accessError !== null}
                />
            ) : null}
            <Button onClick={() => onSubmit(model, concentrations, parameters)} disabled={accessError !== null}>
                Run simulation
            </Button>
        </Column>
    );
};

const ModelsPage: React.FC = () => {
    const [resultId, setResultId] = useState<string | undefined>(undefined);

    const handleSubmit = async (model: ModelInfo, concs: Record<string, number>, params: Record<string, any>) => {
        const resultId = await runSimulation(model.modelId, concs, params);
        setResultId(resultId);
    };

    return (
        <>
            <ModelsInputSelect onSubmit={handleSubmit} />
            {resultId ? <Results resultId={resultId} /> : null}
        </>
    );
};

export default ModelsPage;
