import React, { useState } from "react";
import { TextField } from "@equinor/eds-core-react";
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

  const [inputConcentrations, setInputConcentrations] =
    useState<inputConcentrations>({
      CO2: 1,
      H2O: 20,
      H2S: 30,
      SO2: 10,
      NO2: 50,
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
      const response = await fetch("http://localhost:8000/run_simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trange: [300],
          prange: [10],
          concs: absoluteConcentrations,
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
    <div style={{ display: "flex", overflow: "auto" }}>
      <div style={{ width: "200px" }}>
        <h3>ARCS</h3>
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
                onChange={(e) =>
                  setInputConcentrations((prevSettings) => ({
                    ...prevSettings,
                    [key]: parseFloat(e.target.value),
                  }))
                }
              />
            ))}
            <br></br>
            <b>Config settings</b>
            {Object.keys(settings).map((key) => (
              <TextField
                label={key}
                id={key}
                step="any"
                name={key}
                value={settings[key as keyof Settings]}
                onChange={(e) =>
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
