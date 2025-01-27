import React, { useEffect, useState } from "react";
import { Autocomplete, Button, Checkbox, TextField } from "@equinor/eds-core-react";
import loader from "../assets/VGH.gif";
import Results from "./Results";
import { SimulationResults } from "../dto/SimulationResults";
import { FormConfig, ModelConfig } from "../dto/FormConfig";
import { getModels, getProjects, runSimulation, saveResult, saveSimulation } from "../api/api";
import { useParams } from "react-router-dom";
import { useErrorStore } from "../hooks/useErrorState";
import { Project } from "../dto/Project";

interface InputConcentrations {
    [key: string]: number;
}

const InputForm: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [inputConcentrations, setInputConcentrations] = useState<InputConcentrations>({});
    const [newConcentration, setNewConcentration] = useState<string>("");
    const [newConcentrationValue, setNewConcentrationValue] = useState<number>(0);
    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("arcs");
    const [models, setModels] = useState<Record<string, ModelConfig>>({});
    const [formConfig, setFormConfig] = useState<FormConfig>({
        inputConcentrations: {},
        settings: {},
    });
    const [saveSimulationChecked, setSaveSimulationChecked] = useState<boolean>(false);
    const [simulationName, setSimulationName] = useState<string>("");
    const [projects, setProjects] = useState<Project[]>([]);

    const setError = useErrorStore((state) => state.setError);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const models = await getModels();
                setModels(models);
                setFormConfig(models[selectedModel].formconfig);
            } catch (error) {
                if (error instanceof Error) {
                    setError("An error occurred: " + error.message);
                } else {
                    setError("An unknown error occurred.");
                }
            }
        };
        fetchModels();
        const fetchProjects = async () => {
            setProjects(await getProjects());
        };
        fetchProjects();
        setSelectedProjectId(projectId || "");
    }, [selectedModel, setError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSimulationResults(null);
        setIsLoading(true);
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.toLocaleString("default", { month: "short" });
        const year = currentDate.getFullYear();
        try {
            const result = await runSimulation(formConfig, selectedModel);
            if (saveSimulationChecked && selectedProjectId) {
                const simulation = await saveSimulation(
                    selectedProjectId!,
                    formConfig,
                    selectedModel,
                    simulationName,
                    `${day}. ${month} ${year}`
                );
                await saveResult(selectedProjectId!, result, simulation.id);
            }
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
                    <div style={{ marginBottom: "20px" }}>
                        <Autocomplete
                            label="Selected project:"
                            options={projects.map((project) => project.name)}
                            placeholder={projects.find((proj) => proj.id === selectedProjectId)?.name || ""}
                            onOptionsChange={({ selectedItems }) =>
                                setSelectedProjectId(
                                    projects.find((proj) => proj.name === selectedItems[0])?.id ||
                                        projects.find((proj) => proj.id === projectId)?.id ||
                                        ""
                                )
                            }
                        />
                        <Checkbox
                            disabled={!selectedProjectId}
                            label={selectedProjectId ? "Save Simulation" : "Can't save simulation without a project"}
                            checked={saveSimulationChecked}
                            onChange={(e) => setSaveSimulationChecked(e.target.checked)}
                        />
                        {saveSimulationChecked && selectedProjectId && (
                            <TextField
                                id="simulation-name"
                                label="Simulation Name"
                                value={simulationName}
                                onChange={(e: { target: { value: React.SetStateAction<string> } }) =>
                                    setSimulationName(e.target.value)
                                }
                            />
                        )}
                    </div>
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
                                onOptionsChange={({ selectedItems }) => setNewConcentration(selectedItems[0] || "")}
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
                            {Object.keys(formConfig.settings).map((key) => {
                                const setting = formConfig.settings[key];
                                return setting.input_type === "autocomplete" ? (
                                    <Autocomplete
                                        key={key}
                                        id={key}
                                        label={key}
                                        meta={setting.meta}
                                        placeholder={`Select ${key}`}
                                        options={setting.values || []}
                                        initialSelectedOptions={[setting.defaultvalue]}
                                        hideClearButton={true}
                                        onOptionsChange={({ selectedItems }) =>
                                            setFormConfig((prevConfig: FormConfig) => ({
                                                ...prevConfig,
                                                settings: {
                                                    ...prevConfig.settings,
                                                    [key]: {
                                                        ...prevConfig.settings[key],
                                                        defaultvalue:
                                                            selectedItems[0] || prevConfig.settings[key].defaultvalue,
                                                    },
                                                },
                                            }))
                                        }
                                    />
                                ) : (
                                    <TextField
                                        type="number"
                                        key={key}
                                        label={key}
                                        id={key}
                                        step="any"
                                        name={key}
                                        meta={setting.meta}
                                        value={setting.defaultvalue}
                                        onChange={(e: { target: { value: string } }) =>
                                            setFormConfig((prevConfig: FormConfig) => ({
                                                ...prevConfig,
                                                settings: {
                                                    ...prevConfig.settings,
                                                    [key]: {
                                                        ...prevConfig.settings[key],
                                                        defaultvalue: parseFloat(e.target.value),
                                                    },
                                                },
                                            }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                    <br />
                    <br />
                    <Button type="submit">Run simulation</Button>
                </form>
            </div>
            <div style={{ marginLeft: "50px" }}>
                {isLoading && <img src={loader} alt="Loading" style={{ width: "70px" }} />}
                {simulationResults && <Results simulationResults={simulationResults} />}
            </div>
        </div>
    );
};

export default InputForm;
