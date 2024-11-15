import React, { useState } from "react";
import { TextField } from "@equinor/eds-core-react";
import logo from '../assets/ARCS_Logo.png'; // Adjust the path to your logo image

interface Settings {
  Temperature: number;
  Pressure: number;
  Sample_length: number;
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
    Temperature: 300,
    Pressure: 10,
    Sample_length: 100,
    
  });

  const [inputConcentrations, setInputConcentrations] =
    useState<inputConcentrations>({
        CO2: 1,
        H2O: 2e-5,
        H2S: 3e-5,
        SO2: 1e-5,
        NO2: 5e-5,
    });

  const [simulationResults, setSimulationResults] =
    useState<SimulationResults | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulationResults(null);
    setIsLoading(true);

    const absoluteConcentrations = { ...inputConcentrations };
    for (const key in absoluteConcentrations) {
      absoluteConcentrations[key as keyof inputConcentrations] /= 10000;
    }

    try {
      const response = await fetch("https://api-arcs-dev.radix.equinor.com/run_simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: 300,
          pressure: 10,
          concs: absoluteConcentrations,
          samples: 10,
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
    <div style={{ display: "flex", overflow: "auto" }}>
      <div style={{ width: "200px" }}>
      <img src={logo} alt="Logo" style={{ width: '100px', marginRight: '10px' }} />
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
                onChange={(e: { target: { value: string; }; }) =>
                  setInputConcentrations((prevSettings) => ({
                    ...prevSettings,
                    [key]: parseFloat(e.target.value),
                  }))
                }
              />
            ))}
            <br></br>
            <b>Settings</b>
            {Object.keys(settings).map((key) => (
              <TextField
                label={key}
                id={key}
                step="any"
                name={key}
                value={settings[key as keyof Settings]}
                onChange={(e: { target: { value: string; }; }) =>
                  setSettings((prevConcentrations) => ({
                    ...prevConcentrations,
                    [key]: parseFloat(e.target.value),
                  }))
                }
              />
            ))}
            <br></br>
            <button type="submit">Run simulation</button>
          </form>
        </div>
      </div>
      <div style={{ marginLeft: "50px" }}>
        {isLoading && <p>Running...</p>}
        {simulationResults && (
          <div>
            <h3>Simulation results</h3>
            <pre>{JSON.stringify(simulationResults, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArcsForm;
