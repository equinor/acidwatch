import { Autocomplete } from "@equinor/eds-core-react";
import { Project } from "@/dto/Project";

const ProjectSelector: React.FC<{
    projects: Project[];
    setSelectedProjectId: (id: string) => void;
    isSimulationSaving: boolean;
}> = ({ projects, setSelectedProjectId, isSimulationSaving }) => {
    return (
        <Autocomplete
            label="Save to project:"
            options={projects.map((project) => project.name)}
            disabled={isSimulationSaving}
            onOptionsChange={({ selectedItems }) => {
                setSelectedProjectId(projects.find((proj) => proj.name === selectedItems[0])?.id || "");
            }}
        />
    );
};

export default ProjectSelector;
