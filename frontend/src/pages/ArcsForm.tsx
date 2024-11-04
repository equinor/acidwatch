import React, { useState } from "react";

interface Settings {
    nprocs: number;
    sample_length: number;
    max_rank: number;
    max_compounds: number;
    probability_threshold: number;
    path_depth: number;
    ceiling: number;
    scale_highest: number;
}

interface inputConcentrations {
    CO2: number;
    H2O: number;
    H2S: number;
    SO2: number;
    NO2: number;
}

interface SimulationResults {
    initfinaldiff: any;
    data: any;
}

const ArcsForm: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({
        nprocs: 1,
        sample_length: 320,
        max_rank: 10,
        max_compounds: 5,
        probability_threshold: 0.1,
        path_depth: 5,
        ceiling: 2000,
        scale_highest: 0.2,
    });

    const [inputConcentrations, setInputConcentrations] = useState<inputConcentrations>({
        CO2: 1,
        H2O: 2e-5,
        H2S: 3e-5,
        SO2: 1e-5,
        NO2: 5e-5,
    });

    const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const handleConcentrationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputConcentrations((prevConcentrations) => ({
            ...prevConcentrations,
            [name]: parseFloat(value),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSimulationResults(null);
        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:8000/run_simulation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    trange: [300],
                    prange: [10],
                    concs: inputConcentrations,
                    settings: settings,
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

    return (
        <div>
            <h3>ARCS</h3>

            <form onSubmit={handleSubmit}>
                <b>Input concentrations</b>
                {Object.keys(inputConcentrations).map((key) => (
                    <div key={key}>
                        <label>{key}:</label>
                        <input
                            type="number"
                            step="any"
                            name={key}
                            value={inputConcentrations[key as keyof inputConcentrations]}
                            onChange={handleConcentrationsChange}
                        />
                    </div>
                ))}
                <br></br>
                <b>Config settings</b>
                {Object.keys(settings).map((key) => (
                    <div key={key}>
                        <label>{key}:</label>
                        <input name={key} value={settings[key as keyof Settings]} />
                    </div>
                ))}
                <br></br>
                <button type="submit">Run simulation</button>
            </form>
            {isLoading && <p>Running...</p>}
            {simulationResults && (
                <div>
                    <h3>Simulation results</h3>
                    <pre>{JSON.stringify(simulationResults, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default ArcsForm;
