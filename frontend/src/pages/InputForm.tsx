import React, { useEffect, useState } from "react";
import { Autocomplete, Button, EdsProvider, Radio, TextField } from "@equinor/eds-core-react";
import loader from "../assets/VGH.gif";
import Results from "./Results";
import { SimulationResults } from "../dto/SimulationResults";
import { FormConfig, ModelConfig } from "../dto/FormConfig";
import { getModels, runSimulation } from "../api/api";
import { useErrorStore } from "../hooks/useErrorState";
import InputSettings from "../components/InputSettings";
import { useMutation, useQuery } from "@tanstack/react-query";
import SaveResult from "../components/SaveResult";
import { useIsAuthenticated } from "@azure/msal-react";

interface InputConcentrations {
    [key: string]: number;
}

const InputForm: React.FC = () => {
    const [inputConcentrations, setInputConcentrations] = useState<InputConcentrations>({});
    const [newConcentration, setNewConcentration] = useState<string>("");
    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("arcs");
    const isAuthenticated = useIsAuthenticated();

    const [formConfig, setFormConfig] = useState<FormConfig>({
        inputConcentrations: {},
        settings: {},
    });
    const newConcentrationValue = 0;
    const setError = useErrorStore((state) => state.setError);

    const runSimulationMutation = useMutation({
        onMutate: () => {
            setIsSimulationRunning(true);
            setSimulationResults(null);
        },
        mutationFn: () => runSimulation(formConfig, selectedModel),
        onError: (error) => setError("Could not run simulation: " + error),
        onSuccess: (result) => setSimulationResults(result),
        onSettled: () => setIsSimulationRunning(false),
    });

    const {
        data: fetchedModels,
        error: modelsError,
        isLoading: modelsAreLoading,
    } = useQuery({ queryKey: ["models"], queryFn: getModels });

    useEffect(() => {
        const models: Record<string, ModelConfig> = fetchedModels ? fetchedModels : {};
        if (!modelsAreLoading && !modelsError) {
            setFormConfig(models[selectedModel].formconfig);
        }
    }, [fetchedModels, selectedModel, modelsAreLoading, modelsError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        runSimulationMutation.mutate();
    };

    const handleAddConcentration = () => {
        if (newConcentration && !Object.prototype.hasOwnProperty.call(inputConcentrations, newConcentration)) {
            setInputConcentrations((prevConcentrations) => ({
                ...prevConcentrations,
                [newConcentration]: newConcentrationValue,
            }));
            setFormConfig((prevConfig: FormConfig) => ({
                ...prevConfig,
                inputConcentrations: {
                    ...prevConfig.inputConcentrations,
                    [newConcentration]: {
                        defaultvalue: newConcentrationValue,
                        type: "float",
                        input_type: "textbox",
                        enabled: true,
                    },
                },
            }));
        }
    };

    const initialComponents = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === true
    );
    const additionalComponents = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === false
    );

    if (modelsAreLoading && !fetchedModels) return <>Fetching models ...</>;
    if (modelsError && !fetchedModels) return <>Error: Could not fetch models</>;

    return (
        <div style={{ display: "flex" }}>
            <div style={{ width: "200px", marginLeft: "20px" }}>
                <form onSubmit={handleSubmit}>
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            <b>Select model</b>
                            <EdsProvider density="compact">
                                <div>
                                    {Object.keys(fetchedModels || {}).map((model) => (
                                        <div key={model}>
                                            <Radio
                                                label={model === "co2spec" ? "ToCoMo" : model}
                                                name="model"
                                                value={model}
                                                checked={selectedModel === model}
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </EdsProvider>
                        </div>
                        {formConfig.unavailable !== null ? (
                            <div style={{ width: "350px" }}>
                                <>{formConfig.unavailable}</>
                            </div>
                        ) : (
                            <>
                                <b>Input concentrations</b>
                                {initialComponents.map((key) => {
                                    const inputconc = formConfig.inputConcentrations[key];
                                    return (
                                        <TextField
                                            type="number"
                                            key={key}
                                            label={key}
                                            id={key}
                                            style={{ paddingTop: "5px" }}
                                            step="any"
                                            name={key}
                                            max={inputconc.max}
                                            meta={inputconc.meta}
                                            placeholder={"0"}
                                            value={inputconc.defaultvalue === 0 ? "" : inputconc.defaultvalue}
                                            onChange={(e: { target: { value: string } }) =>
                                                setFormConfig((prevConfig: FormConfig) => ({
                                                    ...prevConfig,
                                                    inputConcentrations: {
                                                        ...prevConfig.inputConcentrations,
                                                        [key]: {
                                                            ...prevConfig.inputConcentrations[key],
                                                            defaultvalue: Math.max(0, parseFloat(e.target.value)) || 0,
                                                        },
                                                    },
                                                }))
                                            }
                                        />
                                    );
                                })}
                                <br />
                                {additionalComponents.length > 0 && (
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <Autocomplete
                                            id="newConcentration"
                                            label=""
                                            placeholder="Add new"
                                            options={additionalComponents}
                                            onOptionsChange={({ selectedItems }) =>
                                                setNewConcentration(selectedItems[0] || "")
                                            }
                                        />
                                        <Button onClick={handleAddConcentration}>+</Button>
                                    </div>
                                )}
                                {Object.keys(formConfig.settings).length > 0 && (
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center" }}></div>
                                        <br />
                                        <b>{selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} Settings</b>
                                        <InputSettings formConfig={formConfig} setFormConfig={setFormConfig} />
                                    </div>
                                )}
                                <br />
                                <Button type="submit" disabled={isSimulationRunning}>
                                    Run simulation
                                </Button>
                            </>
                        )}
                    </>
                </form>
            </div>
            <div style={{ marginLeft: "100px" }}>
                {isSimulationRunning && <img src={loader} alt="Loading" style={{ width: "70px" }} />}
                {simulationResults && (
                    <>
                        <h3>Save this simulation?</h3>
                        {isAuthenticated ? (
                            <>
                                <SaveResult
                                    props={{
                                        formConfig,
                                        selectedModel,
                                        result: simulationResults,
                                    }}
                                />
                            </>
                        ) : (
                            <p>User is not authenticated. This simulation cannot be saved.</p>
                        )}
                        <Results simulationResults={simulationResults} />
                    </>
                )}
            </div>
        </div>
    );
};

export default InputForm;
