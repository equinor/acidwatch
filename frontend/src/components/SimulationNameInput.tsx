import { TextField } from "@equinor/eds-core-react";

const SimulationNameInput: React.FC<{
    simulationName: string;
    setSimulationName: (name: string) => void;
    isSimulationSaving: boolean;
}> = ({ simulationName, setSimulationName, isSimulationSaving }) => {
    return (
        <TextField
            id="simulation-name"
            label="Simulation Name:"
            value={simulationName}
            disabled={isSimulationSaving}
            onChange={(e: { target: { value: string } }) => setSimulationName(e.target.value)}
            style={{ paddingBottom: "10px" }}
        />
    );
};

export default SimulationNameInput;
