import React, { useEffect, useState } from "react";
import { Input, Checkbox, Table, Button } from "@equinor/eds-core-react";
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
    const [allComponents, setAllComponents] = useState<string[]>([]);
    const [modelComponents, setModelComponents] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
    const [userInputValues, setUserInputValues] = useState<
        Record<string, InputComponentProps>
    >({});

    useEffect(() => {
        if (fetchedModels) {
            const components = Object.keys(fetchedModels[defaultModel].formconfig.inputConcentrations);
            setSelectedModel(defaultModel)
            setAllComponents(components);
            setSelectedComponents(new Set([...selectedComponents].filter((component) => components.includes(component))));

            const initialInputValues: Record<string,InputComponentProps> = Object.fromEntries(
                components.map((component) => [component, { conc: 0, from: 0, to: 0, step: 0 }])
            );

            setUserInputValues(initialInputValues);
        }
    }, [fetchedModels]);

    useEffect(() => {
        setModelComponents(allComponents.filter((component) => Object.keys(fetchedModels![selectedModel].formconfig.inputConcentrations).includes(component)));
    }, [selectedModel])
    
    if (modelsAreLoading) {
        return <>Models are loading ...</>;
    }
    if (modelsError) {
        return <>Could not load models</>;
    }

    const handleRangeClick = (component: String) => {
        setSelectedComponents((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(String(component))) {
                newSet.delete(String(component));
            } else {
                newSet.add(String(component));
            }
            return newSet;
        });
    };

    const handleConcChange = (component: string, field: string, value: number) => {
        setUserInputValues((prev) => {
            return {
                ...prev,
                [component]: {
                    ...prev[component],
                    [field]: value,
                },
            };
        });
    };

    const checkIfInputIsInvalid = (component: string) => {
        const { from, to, step } = userInputValues[component];
        if (!(from && to && step)) {
            return false;
        }
        return from < 0 || to < 0 || step <= 0;
    };

    const handleRunBatchSimulation = () => {
        // TODO - requires API & Radixjobs
    }

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
                                {!selectedComponents.has(component) ? (
                                    <Table.Cell key={`${component}-conc`}>
                                        <Input
                                            type="number"
                                            variant={userInputValues[component].conc < 0 ? "error" : undefined}
                                            value={
                                                userInputValues[component]?.conc
                                                    ? String(userInputValues[component].conc)
                                                    : ""
                                            }
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleConcChange(component, "conc", Number(e.target.value))
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
                                                    userInputValues[component]?.from
                                                        ? String(userInputValues[component].from)
                                                        : ""
                                                }
                                                placeholder={
                                                    !userInputValues[component]?.to
                                                        ? "From"
                                                        : ""
                                                }
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, "from", Number(e.target.value))
                                                }
                                                rightAdornments={<>ppm</>}
                                            />
                                            <Input
                                                key={`${component}-to`}
                                                variant={checkIfInputIsInvalid(component) ? "error" : undefined}
                                                
                                                value={
                                                    userInputValues[component]?.to
                                                        ? String(userInputValues[component].to)
                                                        : ""
                                                }
                                                placeholder={
                                                    !userInputValues[component]?.to
                                                        ? "To"
                                                        : ""
                                                }
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, "to", Number(e.target.value))
                                                }
                                                rightAdornments={<>ppm</>}
                                            />
                                            <Input
                                                key={`${component}-step`}
                                                variant={checkIfInputIsInvalid(component) ? "error" : undefined}
                                                value={
                                                    userInputValues[component]?.step
                                                        ? String(userInputValues[component].step)
                                                        : ""
                                                }
                                                placeholder={
                                                    !userInputValues[component]?.step
                                                        ? "Step"
                                                        : ""
                                                }
                                                type="number"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleConcChange(component, "step", Number(e.target.value))
                                                }
                                            />
                                        </div>
                                    </Table.Cell>
                                )}
                                <Table.Cell key={`${component}-range`}>
                                    <Checkbox
                                        defaultChecked={selectedComponents.has(component)}
                                        onChange={() => handleRangeClick(component)}
                                    />
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
            <Button
                style={{ marginTop: "8px" }}
                onClick={handleRunBatchSimulation}
            >{`Run ${calculateNumberOfSimulations(
                    userInputValues, 
                    new Set(
                        [...selectedComponents].filter(component => modelComponents.includes(component))
                    ))} simulations`}
            </Button>
        </>
    );
};

export default BatchInput;
