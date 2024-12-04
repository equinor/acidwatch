import React, { useState } from "react";
import { Autocomplete, Button, TextField } from "@equinor/eds-core-react";
import loader from "../assets/VGH.gif";
import Results from "./Results";
import { SimulationResults } from "../dto/SimulationResults";
import { formConfig as initialFormConfig, FormConfig } from "../dto/FormConfig";
import { runSimulation } from "../api/api";

interface inputConcentrations {
    [key: string]: number;
}

const ArcsForm: React.FC = () => {
    const [inputConcentrations, setInputConcentrations] = useState<inputConcentrations>({});
    const [newConcentration, setNewConcentration] = useState<string>("");
    const [newConcentrationValue, setNewConcentrationValue] = useState<number>(0);
    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedApi, setSelectedApi] = useState<string>("ARCS");
    const [formConfig, setFormConfig] = useState<FormConfig>(initialFormConfig);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSimulationResults(null);
        setIsLoading(true);

        try {
            const data = await runSimulation(formConfig);
            setSimulationResults(data);
        } catch (error) {
            console.error("Error running simulation:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddConcentration = () => {
        if (newConcentration && !inputConcentrations.hasOwnProperty(newConcentration)) {
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
            setNewConcentration("");
            setNewConcentrationValue(0);
        }
    };

    const initialCompounds = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === true
    );
    const additionalCompounds = Object.keys(formConfig.inputConcentrations || {}).filter(
        (key) => formConfig.inputConcentrations[key].enabled === false
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", overflow: "auto", marginTop: "40px" }}>
            <div style={{ display: "flex", overflow: "auto" }}>
                <div style={{ width: "200px", marginLeft: "20px", marginRight: "40px" }}>
                    <div style={{ marginBottom: "20px" }}>
                        <label htmlFor="api-select">Select model </label>
                        <select id="api-select" value={selectedApi} onChange={(e) => setSelectedApi(e.target.value)}>
                            <option value="ARCS">ARCS</option>
                            <option value="CO2Demo">CO2SpecDemo</option>
                        </select>
                    </div>

                    <div>
                        <form onSubmit={handleSubmit}>
                            <b>Input concentrations</b>
                            {initialCompounds.map((key) => (
                                <TextField
                                    key={key}
                                    label={key}
                                    id={key}
                                    step="any"
                                    name={key}
                                    meta="ppm"
                                    value={formConfig.inputConcentrations[key].defaultvalue}
                                    onChange={(e: { target: { value: string } }) =>
                                        setFormConfig((prevConfig: FormConfig) => ({
                                            ...prevConfig,
                                            inputConcentrations: {
                                                ...prevConfig.inputConcentrations,
                                                [key]: {
                                                    ...prevConfig.inputConcentrations[key],
                                                    defaultvalue: parseFloat(e.target.value),
                                                },
                                            },
                                        }))
                                    }
                                />
                            ))}

                            <br />
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
                            <br />
                            <br />
                            <br />
                            <b>Settings</b>
                            {Object.keys(formConfig.settings).map((key) => (
                                <TextField
                                    key={key}
                                    label={key}
                                    id={key}
                                    step="any"
                                    name={key}
                                    meta="ppm"
                                    value={formConfig.settings[key].defaultvalue}
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
                            ))}
                            <br />

                            <br />
                            <Button type="submit">Run simulation</Button>
                        </form>
                    </div>
                </div>
                <div style={{ marginLeft: "50px" }}>
                    {isLoading && <img src={loader} alt="Loading" style={{ width: "70px" }} />}
                    {simulationResults && <Results simulationResults={simulationResults} />}
                </div>
            </div>
        </div>
    );
};

export default ArcsForm;
