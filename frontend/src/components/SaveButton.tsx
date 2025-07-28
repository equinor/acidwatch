import { Button, Tooltip } from "@equinor/eds-core-react";

const SaveButton: React.FC<{
    handleSave: () => void;
    isSimulationSaved: boolean;
    simulationName: string;
    selectedProjectId: string;
    isSimulationSaving: boolean;
}> = ({ handleSave, isSimulationSaved, simulationName, selectedProjectId, isSimulationSaving }) => {
    const stillSaving = Boolean(isSimulationSaving);
    const validSimulationName = Boolean(simulationName && simulationName.trim());
    const validProjectId = Boolean(selectedProjectId);

    let toolTipString = "";
    if (stillSaving) {
        toolTipString = "Saving simulation, please wait...";
    } else if (!validProjectId) {
        toolTipString = "Please select a project to save the simulation.";
    } else if (!validSimulationName) {
        toolTipString = "Please enter a valid simulation name.";
    } else {
        toolTipString = "Ready to save the simulation.";
    }

    return (
        <Tooltip title={toolTipString}>
            <Button
                onClick={handleSave}
                disabled={!validSimulationName || !validProjectId || isSimulationSaved}
                //variant={!Boolean(selectedProjectId && simulationName) ? "ghost" : "contained"}
                color={!isSimulationSaved ? "primary" : "secondary"}
            >
                {"Save simulation"}
            </Button>
        </Tooltip>
    );
};

export default SaveButton;
