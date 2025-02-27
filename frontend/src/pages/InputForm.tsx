import React, { useEffect, useState } from "react";
import { Autocomplete, Button, Checkbox, TextField } from "@equinor/eds-core-react";
import loader from "../assets/VGH.gif";
import Results from "./Results";
import { SimulationResults } from "../dto/SimulationResults";
import { FormConfig, ModelConfig } from "../dto/FormConfig";
import { getModels, getProjects, runSimulation } from "../api/api";
import { useErrorStore } from "../hooks/useErrorState";
import { Project } from "../dto/Project";
import InputSettings from "../components/InputSettings";
import { useQuery } from "@tanstack/react-query";
import SaveResultButton from "../components/SaveResultButton";
interface InputConcentrations {
    [key: string]: number;
}

const InputForm: React.FC = () => {
    const [inputConcentrations, setInputConcentrations] = useState<InputConcentrations>({});
    const [newConcentration, setNewConcentration] = useState<string>("");
    const [newConcentrationValue, setNewConcentrationValue] = useState<number>(0);
    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
    const [isSimulationRunning, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("arcs");
    const [formConfig, setFormConfig] = useState<FormConfig>({
        inputConcentrations: {},
        settings: {},
    });
    const setError = useErrorStore((state) => state.setError);

    const {
        data: fetchedProjects,
        error: projectsError,
        isLoading: projectsAreLoading,
    } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
    const projects: Project[] = fetchedProjects ? fetchedProjects : [];

    const {
        data: fetchedModels,
        error: modelsError,
        isLoading: modelsAreLoading,
    } = useQuery({ queryKey: ["models"], queryFn: getModels });
    const models: Record<string, ModelConfig> = fetchedModels ? fetchedModels : {};

    useEffect(() => {
        if (!modelsAreLoading && !modelsError) {
            setFormConfig(models[selectedModel].formconfig);
        }
    }, [models, selectedModel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSimulationResults(null);
        setIsLoading(true);
        try {
            const result = await runSimulation(formConfig, selectedModel);
            setSimulationResults(result);
        } catch (error) {
            if (error instanceof Error) {
                setError("Error running simulation: " + error.message);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
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
    const initialCompounds = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === true
    );
    const additionalCompounds = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === false
    );

    return (
        <div style={{ display: "flex" }}>
            <div style={{ width: "200px", marginLeft: "20px", marginRight: "40px" }}>
                <form onSubmit={handleSubmit}>
                    {modelsAreLoading ? (
                        <div>Fetching models ...</div>
                    ) : modelsError ? (
                        <div>Could not fetch models.</div>
                    ) : (
                        <>
                            <div style={{ marginBottom: "20px" }}>
                                <label htmlFor="api-select">Select model </label>
                                <select
                                    id="api-select"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                >
                                    {Object.keys(models).map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <b>Input concentrations</b>
                            {initialCompounds.map((key) => {
                                const inputconc = formConfig.inputConcentrations[key];
                                return (
                                    <TextField
                                        type="number"
                                        key={key}
                                        label={key}
                                        id={key}
                                        step="any"
                                        name={key}
                                        meta={inputconc.meta}
                                        value={inputconc.defaultvalue}
                                        onChange={(e: { target: { value: string } }) =>
                                            setFormConfig((prevConfig: FormConfig) => ({
                                                ...prevConfig,
                                                inputConcentrations: {
                                                    ...prevConfig.inputConcentrations,
                                                    [key]: {
                                                        ...prevConfig.inputConcentrations[key],
                                                        defaultvalue: Math.max(0, parseFloat(e.target.value)),
                                                    },
                                                },
                                            }))
                                        }
                                    />
                                );
                            })}
                            <br />
                            {additionalCompounds.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <Autocomplete
                                        id="newConcentration"
                                        label=""
                                        placeholder="Add new"
                                        options={additionalCompounds}
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
                                    <br />
                                    <b>Settings</b>
                                    <InputSettings formConfig={formConfig} setFormConfig={setFormConfig} />
                                </div>
                            )}
                            <br />
                            <br />
                            <Button type="submit">Run simulation</Button>
                        </>
                    )}
                </form>
            </div>
            <div style={{ marginLeft: "50px" }}>
                {isSimulationRunning && <img src={loader} alt="Loading" style={{ width: "70px" }} />}
                {simulationResults && (
                    <>
                        <h3>Save this simulation?</h3>
                        <SaveResultButton
                            props={{
                                formConfig,
                                selectedModel,
                                result: simulationResults,
                            }}
                        />
                        <Results simulationResults={simulationResults} />
                    </>
                )}
            </div>
        </div>
    );
};

export default InputForm;
