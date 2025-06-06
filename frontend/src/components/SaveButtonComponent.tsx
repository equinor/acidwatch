import { Button } from "@equinor/eds-core-react";

const SaveButtonComponent: React.FC<{
    handleSave: () => void;
    isSimulationSaved: boolean;
    simulationName: string;
    selectedProjectId: string;
    isSimulationSaving: boolean;
}> = ({ handleSave, isSimulationSaved, simulationName, selectedProjectId, isSimulationSaving }) => {
    const notSaveAble = !Boolean(selectedProjectId && simulationName && simulationName.trim()) && !isSimulationSaving;

    return (
        <Button
            onClick={handleSave}
            disabled={notSaveAble}
            variant={!Boolean(selectedProjectId && simulationName) ? "ghost" : "contained"}
        >
            {isSimulationSaved
                ? `Saved simulation as "${simulationName}" to project "${selectedProjectId}"`
                : !selectedProjectId
                  ? "Cannot save without a project"
                  : !simulationName || !simulationName.trim()
                    ? "Cannot save without a valid simulation name"
                    : "Save simulation"}
        </Button>
    );
};

export default SaveButtonComponent;
