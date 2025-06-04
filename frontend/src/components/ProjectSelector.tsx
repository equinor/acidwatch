import { Autocomplete, TextField } from "@equinor/eds-core-react";

interface ProjectSelectorProps {}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({}) => {
    return (
        <>
            <TextField
                label="Save to project:"
                placeholder={"ProjectName"}
                disabled={false}
                id = {"model"}
                //onOptionsChange={({ selectedItems }) => {
                //    setSelectedProjectId(projects!.find((proj) => proj.name === selectedItems[0])?.id || "");
                //    setIsSimulationSaved(false);
                //}}
            />{" "}
        </>
    );
};
export default ProjectSelector;
