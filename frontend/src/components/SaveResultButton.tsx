import { useMutation, useQuery } from "@tanstack/react-query";
import { getProjects, saveResult, saveSimulation } from "../api/api";
import { FormConfig } from "../dto/FormConfig";
import { SimulationResults } from "../dto/SimulationResults";
import { Autocomplete, Button, Checkbox, TextField } from "@equinor/eds-core-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useErrorStore } from "../hooks/useErrorState";

interface SimulationProps {
    formConfig: FormConfig;
    selectedModel: string;
    result: SimulationResults;
}

const SaveResultButton: React.FC<{ props: SimulationProps }> = ({ props }) => {
    const { projectId } = useParams<{ projectId: string }>();
    const { setError } = useErrorStore();
    const [projectName, setProjectName] = useState<string>("");
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");
    const [simulationName, setSimulationName] = useState<string>("");
    const [isSimulationSaving, setIsSimulationSaving] = useState<boolean>(false);
    const [isSimulationSaved, setIsSimulationSaved] = useState<boolean>(false);
    const {
        data: projects,
        isLoading,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: getProjects,
    });

    useEffect(() => {
        setProjectName(projects?.find((proj) => proj.id === selectedProjectId)?.name || "");
    }, [selectedProjectId]);

    const saveSimulationMutation = useMutation({
        onMutate: () => setIsSimulationSaving(true),
        mutationFn: (props: SimulationProps) =>
            saveSimulation(selectedProjectId, props.formConfig, props.selectedModel, simulationName),
        onSuccess: (savedSimulation) => {
            setIsSimulationSaved(true);
            saveResultToSimulationMutation.mutate({
                selectedProjectId: selectedProjectId,
                result: props.result,
                simulationId: savedSimulation.id,
            });
        },
        onError: () => setError(`Could not save simulation to project: "${projectName}"`),
        onSettled: () => setIsSimulationSaving(false),
    });

    const saveResultToSimulationMutation = useMutation({
        mutationFn: ({
            selectedProjectId,
            result,
            simulationId,
        }: {
            selectedProjectId: string;
            result: SimulationResults;
            simulationId: string;
        }) => saveResult(selectedProjectId, result, simulationId),
    });

    const handleSave = () => {
        saveSimulationMutation.mutate(props);
    };

    if (!projects) {
        return <div>Cannot save simulation: Could not fetch projects.</div>;
    }

    return (
        <div style={{ marginBottom: "20px" }}>
            {isLoading ? (
                "Loading projects ..."
            ) : !projects ? (
                "Could not fetch projects"
            ) : (
                <Autocomplete
                    label="Save to project:"
                    options={projects.map((project) => project.name)}
                    placeholder={projectName}
                    disabled={isSimulationSaving}
                    onOptionsChange={({ selectedItems }) => {
                        setSelectedProjectId(projects.find((proj) => proj.name === selectedItems[0])?.id || "");
                        setIsSimulationSaved(false);
                    }}
                />
            )}
            <TextField
                id="simulation-name"
                label="Simulation Name:"
                value={simulationName}
                disabled={isSimulationSaving}
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => {
                    setSimulationName(e.target.value);
                    setIsSimulationSaved(false);
                }}
                style={{paddingBottom:"10px"}}
            />
            {isSimulationSaved ? (
                `Saved simulation as "${simulationName}" to project "${projects.find((proj) => proj.id === selectedProjectId)?.name || ""}"`
            ) : (
                <Button
                    onClick={handleSave}
                    disabled={!Boolean(selectedProjectId && simulationName) && !isSimulationSaving}
                    variant={!Boolean(selectedProjectId && simulationName) ? "ghost" : "contained"}
                >
                    {!selectedProjectId
                        ? "Cannot save without a project"
                        : !simulationName
                          ? "Cannot save without a simulation name"
                          : "Save simulation"}
                </Button>
            )}
        </div>
    );
};
export default SaveResultButton;
