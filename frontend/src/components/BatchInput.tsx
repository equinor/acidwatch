import React, { useEffect, useState } from "react";
import {
    Input,
    Checkbox,
    Table,
    Button,
    Typography,
    Autocomplete,
    Slider,
    TextField,
    AutocompleteChanges,
} from "@equinor/eds-core-react";
import { getModels } from "../api/api";
import { useQuery } from "@tanstack/react-query";
import { calculateNumberOfSimulations } from "../functions/Calculations";
import { InputComponentProps } from "../dto/InputComponentModel";

const BatchInput: React.FC = () => {
    const {
        data: fetchedModels,
        error: modelsError,
        isLoading: modelsAreLoading,
    } = useQuery({ queryKey: ["models"], queryFn: getModels });
    const defaultModel = "arcs";
    const [modelComponents, setModelComponents] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [inputConcs, setInputConcs] = useState<Record<string, InputComponentProps>>({});
    const [inputSettings, setInputSettings] = useState<Record<string, number>>({});

    useEffect(() => {
        if (fetchedModels) {
            const components = Object.keys(fetchedModels[defaultModel].formconfig.inputConcentrations);
            setSelectedModel(defaultModel);
            setSelectedRows(new Set([...selectedRows].filter((component) => components.includes(component))));
            setInputConcs(
                Object.fromEntries(components.map((component) => [component, { val: 0, from: 0, to: 0, step: 0 }]))
            );
        }
    }, [fetchedModels]);

    useEffect(() => {
        if (fetchedModels && selectedModel) {
            setModelComponents(Object.keys(fetchedModels[selectedModel].formconfig.inputConcentrations));
            const settings = Object.keys(fetchedModels[selectedModel].formconfig.settings);
            setInputSettings(
                Object.fromEntries(
                    settings.map((setting: string) => [
                        setting,
                        fetchedModels[selectedModel].formconfig.settings[setting].defaultvalue,
                    ])
                )
            );
        }
    }, [selectedModel]);

    if (modelsAreLoading) {
        return <>Models are loading ...</>;
    }
    if (modelsError) {
        return <>Could not load models</>;
    }
    if (!selectedModel) {
        return <>No selected model</>;
    }

    const handleRangeClick = (component: String) => {
        setSelectedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(String(component))) {
                newSet.delete(String(component));
            } else {
                newSet.add(String(component));
            }
            return newSet;
        });
    };

    const handleConcChange = (component: string, value: number, field: string = "val") => {
        setInputConcs((prev) => {
            return {
                ...prev,
                [component]: {
                    ...prev[component],
                    [field]: value,
                },
            };
        });
    };

    const handleSettingChange = (setting: string, value: any) => {
        setInputSettings((prev) => {
            return {
                ...prev,
                [setting]: value,
            };
        });
    };

    const checkIfInputIsInvalid = (component: string) => {
        const { from, to, step } = inputConcs[component];
        if (!(from && to && step)) {
            return false;
        }
        return from < 0 || to < 0 || step <= 0;
    };

    const handleRunBatchSimulation = () => {
        // TODO - requires API & Radixjobs
    };

    return (
        <>
            <h1>Batch experiment</h1>
            <h3>Select Model:</h3>
            {Object.keys(fetchedModels!).map((model: string) => {
                return (
                    <Button
                        key={`${model}-button`}
                        variant={selectedModel === model ? "contained" : "outlined"}
                        onClick={() => setSelectedModel(model)}
                    >
                        {model}
                    </Button>
                );
            })}
            <Table style={{ width: "550px", marginTop: "8px" }}>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell key={"header-comp"}>Component</Table.Cell>
                        <Table.Cell key={"header-conc"} width={350}>
                            Concentration
                        </Table.Cell>
                        <Table.Cell key={"header-range"}>Range</Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {modelComponents.map((component) => {
                        return (
                            <Table.Row key={`${component}-row`}>
                                <Table.Cell key={`${component}-name`}>{component}</Table.Cell>
                                {!selectedRows.has(component) ? (
                                    <Table.Cell key={`${component}-conc`}>
                                        <Input
                                            type="number"
                                            variant={inputConcs[component].val < 0 ? "error" : undefined}
                                            value={inputConcs[component]?.val ? String(inputConcs[component].val) : ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleConcChange(component, Number(e.target.value))
                                            }
                                            rightAdornments={<>ppm</>}
                                        />
                                    </Table.Cell>
                                ) : (
                                    <Table.Cell key={`${component}-conc`}>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <Input
                                                key={`${component}-from`}
                                                variant={checkIfInputIsInvalid(component) ? "error" : undefined}
                                                value={
                                                    inputConcs[component]?.from
                                                        ? String(inputConcs[component].from)
                                                        : ""
                                                }
                                                placeholder={!inputConcs[component]?.to ? "From" : ""}
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, Number(e.target.value), "from")
                                                }
                                                rightAdornments={<>ppm</>}
                                            />
                                            <Input
                                                key={`${component}-to`}
                                                variant={checkIfInputIsInvalid(component) ? "error" : undefined}
                                                value={
                                                    inputConcs[component]?.to ? String(inputConcs[component].to) : ""
                                                }
                                                placeholder={!inputConcs[component]?.to ? "To" : ""}
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, Number(e.target.value), "to")
                                                }
                                                rightAdornments={<>ppm</>}
                                            />
                                            <Input
                                                key={`${component}-step`}
                                                variant={checkIfInputIsInvalid(component) ? "error" : undefined}
                                                value={
                                                    inputConcs[component]?.step
                                                        ? String(inputConcs[component].step)
                                                        : ""
                                                }
                                                placeholder={!inputConcs[component]?.step ? "Step" : ""}
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, Number(e.target.value), "step")
                                                }
                                            />
                                        </div>
                                    </Table.Cell>
                                )}
                                <Table.Cell key={`${component}-range`}>
                                    <Checkbox
                                        defaultChecked={selectedRows.has(component)}
                                        onChange={() => handleRangeClick(component)}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
            {Object.keys(inputSettings).length > 0 && (
                <Table style={{ width: "550px", marginTop: "8px" }}>
                    <Table.Head>
                        <Table.Row>
                            <Table.Cell>Model setting</Table.Cell>
                            <Table.Cell>Value</Table.Cell>
                        </Table.Row>
                    </Table.Head>
                    <Table.Body>
                        {Object.entries(fetchedModels![selectedModel].formconfig?.settings).map(
                            ([option, properties]) => (
                                <Table.Row key={option}>
                                    <Table.Cell>{option}</Table.Cell>
                                    <Table.Cell colSpan={2}>
                                        {properties.input_type === "autocomplete" ? (
                                            <Autocomplete
                                                options={properties.values ?? [0]}
                                                label={""}
                                                initialSelectedOptions={[inputSettings[option]]}
                                                placeholder={properties.meta}
                                                onOptionsChange={(selectedItem: AutocompleteChanges<number>) =>
                                                    handleSettingChange(option, Number(selectedItem.selectedItems[0]))
                                                }
                                            />
                                        ) : (
                                            <TextField
                                                id={option}
                                                type="number"
                                                key={option}
                                                value={inputSettings[option]}
                                                onChange={(e: { target: { value: string } }) =>
                                                    handleSettingChange(option, Number(e.target.value))
                                                }
                                            />
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            )
                        )}
                    </Table.Body>
                </Table>
            )}
            <Button style={{ marginTop: "8px" }} onClick={handleRunBatchSimulation}>
                {`Run ${calculateNumberOfSimulations(
                    inputConcs,
                    new Set([...selectedRows].filter((component) => modelComponents.includes(component)))
                )} simulations`}
            </Button>
        </>
    );
};

export default BatchInput;
