import { Button } from "@equinor/eds-core-react";
import CreateProjectDialog from "./CreateProjectDialog";
import React from "react";

const CreateProjectPrompt: React.FC<{
    createProjectDialogOpen: boolean;
    setCreateProjectDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ createProjectDialogOpen, setCreateProjectDialogOpen }) => {
    return (
        <div>
            <div style={{ marginBottom: "10px" }}>You have no projects this simulation can be saved to</div>
            <div>
                <Button onClick={() => setCreateProjectDialogOpen(true)}>Create a new project?</Button>
            </div>
            {createProjectDialogOpen && <CreateProjectDialog setCreateProjectDialogOpen={setCreateProjectDialogOpen} />}
        </div>
    );
};

export default CreateProjectPrompt;
