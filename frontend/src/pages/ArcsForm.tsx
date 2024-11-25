import React, { useState, useEffect } from "react";
import { Autocomplete, Button, TextField } from "@equinor/eds-core-react";
import logo from "../assets/ARCS_Logo.png"; // Adjust the path to your logo image
import loader from "../assets/VGH.gif"; // Adjust the path to your loader image
import Results from "./Results"; // Import the new Results component
import { SimulationResults } from "../dto/SimulationResults";
import config from "../configuration";

interface Settings {
    Temperature: number;
    Pressure: number;
    Sample_length: number;
}

interface inputConcentrations {
    H2O: number;
    O2: number;
    H2S: number;
    SO2: number;
    NO2: number;
}

const ArcsForm: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({
        Temperature: 300,
        Pressure: 10,
        Sample_length: 10,
    });

    const [inputConcentrations, setInputConcentrations] = useState<inputConcentrations>({
        H2O: 30,
        O2: 10,
        SO2: 10,
        NO2: 0,
        H2S: 10,
    });
    useEffect(() => {
        console.log("API URL:", config.API_URL);
    }, []);

    const [newConcentration, setNewConcentration] = useState<string>("");
    const [newConcentrationValue, setNewConcentrationValue] = useState<number>(0);
    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSimulationResults(null);
        setIsLoading(true);

        const absoluteConcentrations = { ...inputConcentrations };

        for (const key in absoluteConcentrations) {
            absoluteConcentrations[key as keyof inputConcentrations] /= 1000000;
        }

        try {
            const response = await fetch(config.API_URL + "/run_simulation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    temperature: 300,
                    pressure: 10,
                    concs: absoluteConcentrations,
                    samples: settings.Sample_length,
                }),
            });
            if (!response.ok) {
                throw new Error("Network error");
            }
            const data = await response.json();
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
            setNewConcentration("");
            setNewConcentrationValue(0);
        }
    };
    const options = ["Not working:( ", "H2S04", "S2", "NO"];

    return (
        <div style={{ display: "flex", overflow: "auto", marginTop: "40px" }}>
            <div style={{ width: "200px", marginLeft: "20px", marginRight: "40px" }}>
                <img src={logo} alt="Logo" style={{ width: "100px" }} />
                <div>
                    <form onSubmit={handleSubmit}>
                        <b>Input concentrations</b>
                        {Object.keys(inputConcentrations).map((key) => (
                            <TextField
                                label={key}
                                id={key}
                                step="any"
                                name={key}
                                meta="ppm"
                                value={inputConcentrations[key as keyof inputConcentrations]}
                                onChange={(e: { target: { value: string } }) =>
                                    setInputConcentrations((prevSettings) => ({
                                        ...prevSettings,
                                        [key]: parseFloat(e.target.value),
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
                                options={options}
                                onOptionsChange={({ selectedItems }) => setNewConcentration(selectedItems[0] || "")}
                            />
                            <Button onClick={handleAddConcentration}>+</Button>
                        </div>

                        <br />
                        <br />
                        <br />
                        <b>Settings</b>
                        {Object.keys(settings).map((key) => (
                            <TextField
                                label={key}
                                id={key}
                                step="any"
                                name={key}
                                value={settings[key as keyof Settings]}
                                onChange={(e: { target: { value: string } }) =>
                                    setSettings((prevConcentrations) => ({
                                        ...prevConcentrations,
                                        [key]: parseFloat(e.target.value),
                                    }))
                                }
                            />
                        ))}
                        <br></br>
                        <Button onClick={handleSubmit}>Run simulation</Button>
                    </form>
                </div>
            </div>
            <div style={{ marginLeft: "50px" }}>
                {isLoading && <img src={loader} alt="Logo" style={{ width: "70px" }} />}
                {simulationResults && <Results simulationResults={simulationResults} />}
            </div>
        </div>
    );
};

export default ArcsForm;
