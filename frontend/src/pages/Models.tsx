import React, { useState } from "react";
import { create } from "zustand";
import styled from "styled-components";
import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Autocomplete, Banner, Input, Label, Radio, TextField, Typography } from "@equinor/eds-core-react";
import InputForm from "./InputForm";

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

type AnyParameters = { [key: string]: number };

interface ParameterSchema {
    type: "integer";
    name: string;
    label: string;
    default: number;
    description?: string;
    min?: number;
    max?: number;
    unit?: string;
    custom_unit?: string;
}

interface ModelInfo {
    access_error: string | null
    model_id: string;
    display_name: string;
    concentrations: Record<string, number | null>;
    parameters: {
        properties: { [key: string]: ParameterSchema };
    };
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
                label={model.display_name}
                checked={model.model_id === selectedModel}
                onChange={() => setModel(model.model_id)}
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
            if (model.model_id === modelId) {
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
                        key={model.model_id}
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
}> = ({ name, schema, value, onChange }) => {
    return (
        <>
            <TextField
                type="number"
                label={schema.label}
                min={schema.min}
                max={schema.max}
                unit={schema.unit ?? schema.custom_unit}
                value={value}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(name, event.target.valueAsNumber);
                }}
            />
        </>
    );
};

const ModelParameters: React.FC<{
    model: ModelInfo;
    parameters: AnyParameters;
    onChange: (state: AnyParameters) => void;
}> = ({ model, parameters, onChange }) => {
    const handleChange = (name: string, value: number) => {
        onChange({
            ...parameters,
            [name]: value,
        });
    };

    return (
        <fieldset>
            <legend>Parameters</legend>
            {Object.entries(model.parameters.properties).map(([name, schema]) => (
                <ModelParameterInput name={name} schema={schema} value={parameters[name]} onChange={handleChange} />
            ))}
        </fieldset>
    );
};

const ModelConcentrations: React.FC<{ model: ModelInfo; concentrations: Record<string, number | null> }> = ({
    model,
    concentrations,
}) => {
    const activeEntries = Object.entries(concentrations).map(([name, value]) => {
        return <TextField type="number" label={name} value={value} unit="ppm" />;
    });
    const inactiveOptions = Object.keys(model.concentrations).filter((name) => {
        return concentrations[name] === undefined;
    });

    return (
        <fieldset>
            <legend>Concentrations</legend>
            {activeEntries}
            <Autocomplete label="Disabled" options={inactiveOptions} />
        </fieldset>
    );
};

const ModelsPage: React.FC = () => {
    const [model, setModelInfo] = useState<ModelInfo | undefined>(undefined);
    const [parameters, setParameters] = useState<{ [key: string]: number }>({});
    const [concentrations, setConcentrations] = useState<{ [key: string]: number | null }>({});

    const setModel = (model: ModelInfo) => {
        /* setParameters(
*     Object.fromEntries(
*         Object.entries(model.parameters.properties).map(([name, schema]) => {
*             return [name, schema.default];
*         })
*     )
* );

* setConcentrations(
*     Object.fromEntries(Object.entries(model.concentrations).filter(([_, value]) => value !== null))
* );
 */
        setModelInfo(model);
    };

    const modelSelect = <ModelSelect onModelChange={setModel} />;

    if (model === undefined) {
        return <Column>{modelSelect}</Column>;
    }

    let accessError = null;
    if (model.access_error !== null) {
        accessError = (<Banner>
            <Banner.Message color="danger">
                Tøys
            </Banner.Message>
        </Banner>);
    }

    return (
        <Column>
            {modelSelect}
            {accessError}
            <ModelConcentrations model={model} concentrations={concentrations} />
            {model.parameters.properties.length ? <ModelParameters model={model} parameters={parameters} onChange={() => {}} /> : null}
        </Column>
    );
};

export default ModelsPage;
