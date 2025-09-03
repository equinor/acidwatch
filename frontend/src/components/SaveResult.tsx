import { useMutation, useQuery } from "@tanstack/react-query";
import { getProjects, saveResult, saveSimulation } from "../api/api";
import { SimulationResults } from "../dto/SimulationResults";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useErrorStore } from "../hooks/useErrorState";
import { useAccount } from "@azure/msal-react";
import { Project } from "../dto/Project";
import ProjectSelector from "./ProjectSelector";
import SimulationNameInput from "./SimulationNameInput";
import SaveButton from "./SaveButton";
import CreateProjectPrompt from "./CreateProjectPrompt";

interface SimulationProps {
    parameters: Record<string, number>;
    selectedModel: string;
    result: SimulationResults | undefined;
}

const SaveResult: React.FC<{ props: SimulationProps }> = ({ props }) => {
    const { projectId } = useParams<{ projectId: string }>();
    const { setError } = useErrorStore();
    const [projectName, setProjectName] = useState<string>("");
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "");
    const [simulationName, setSimulationName] = useState<string>("");
    const [isSimulationSaving, setIsSimulationSaving] = useState<boolean>(false);
    const [isSimulationSaved, setIsSimulationSaved] = useState<boolean>(false);
    const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
    const accountId = useAccount()?.localAccountId;
    const {
        data: projects,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: getProjects,
        retry: false,
    });
    const [privateProjects, setPrivateProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (projects) setPrivateProjects(projects.filter((project) => project.owner_id === accountId));
    }, [projects, accountId]);

    useEffect(() => {
        setProjectName(projects?.find((proj) => proj.id === selectedProjectId)?.name || "");
    }, [selectedProjectId, projects]);

    const saveSimulationMutation = useMutation({
        onMutate: () => setIsSimulationSaving(true),
        mutationFn: (props: SimulationProps) => {
            return saveSimulation(
                selectedProjectId,
                props.result,
                props.selectedModel,
                props.parameters,
                simulationName
            );
        },
        onSuccess: (savedSimulation) => {
            setIsSimulationSaved(true);
            if (props.result) {
                saveResultToSimulationMutation.mutate({
                    selectedProjectId: selectedProjectId,
                    result: props.result,
                    simulationId: savedSimulation.id,
                });
            } else {
                setError("Simulation result is undefined and cannot be saved.");
            }
        },
        onError: (error) => {
            console.error("Failed to save simulation:", error);
            setError(`Could not save simulation to project: "${projectName}"`);
        },
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

    if (isLoading && !projects) return <>Fetching projects ...</>;
    if (error && !projects) return <>Cannot save simulation: Could not fetch projects.</>;

    if (privateProjects.length === 0) {
        return (
            <CreateProjectPrompt
                createProjectDialogOpen={createProjectDialogOpen}
                setCreateProjectDialogOpen={setCreateProjectDialogOpen}
            />
        );
    }

    return (
        <>
            <ProjectSelector
                projects={privateProjects}
                setSelectedProjectId={setSelectedProjectId}
                isSimulationSaving={isSimulationSaving}
            />
            <SimulationNameInput
                simulationName={simulationName}
                setSimulationName={setSimulationName}
                isSimulationSaving={isSimulationSaving}
                setIsSimulationSaved={setIsSimulationSaved}
            />
            <SaveButton
                handleSave={handleSave}
                isSimulationSaved={isSimulationSaved}
                simulationName={simulationName}
                selectedProjectId={projectName}
                isSimulationSaving={isSimulationSaving}
            />
        </>
    );
};

export default SaveResult;
