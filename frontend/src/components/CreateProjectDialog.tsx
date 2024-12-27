import { Button, Checkbox, Dialog, TextField, Typography } from "@equinor/eds-core-react";
import { useEffect, useState } from "react";
import { ColumnLayout, RowItem, RowLayout } from "./StyledLayout";
import config from "../configuration";
import { getAccessToken } from "../services/auth";

export interface ICreateProjectDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onCreatedProject: (projectId: string) => void;
}

const CreateProjectDialog = (props: ICreateProjectDialogProps) => {
    const { isOpen, onCancel, onCreatedProject } = props;
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isPrivate, setIsPrivate] = useState(true);

    useEffect(() => {
        if (!isOpen) {
            setNewProjectName("");
            setNewProjectDescription("");
            setIsPrivate(true);
        }
    }, [isOpen]);

    const onCreateProject = async (name: string, description: string, isPrivate: boolean) => {
        setErrorMsg("");
        const token = await getAccessToken();
        try {
            const response = await fetch(config.API_URL + "/project", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
                body: JSON.stringify({
                    name,
                    description,
                    isPrivate,
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            onCreatedProject(data.id);
        } catch (e) {
            console.log(e);
            setErrorMsg("Error creating Project");
        }
    };

    return (
        <Dialog open={isOpen} isDismissable onClose={onCancel} style={{ minWidth: "25vw", overflow: "auto" }}>
            <Dialog.Header>
                <Dialog.Title>Create New Project</Dialog.Title>
            </Dialog.Header>
            <Dialog.CustomContent>
                <ColumnLayout>
                    <RowItem>
                        <TextField
                            id="ProjectName"
                            label="Name"
                            value={newProjectName}
                            onChange={(e) => {
                                setNewProjectName(e.target.value);
                            }}
                        />
                    </RowItem>
                    <RowItem>
                        <TextField
                            id="description"
                            label="Description"
                            value={newProjectDescription}
                            onChange={(e) => {
                                setNewProjectDescription(e.target.value);
                            }}
                        />
                    </RowItem>
                    <RowItem>
                        <Checkbox
                            label="Private"
                            checked={isPrivate}
                            onChange={(e) => {
                                setIsPrivate(e.target.checked);
                            }}
                        />
                    </RowItem>
                    {errorMsg && (
                        <Typography variant="caption" color="danger">
                            {errorMsg}
                        </Typography>
                    )}
                </ColumnLayout>
            </Dialog.CustomContent>
            <Dialog.Actions>
                <RowLayout>
                    <Button
                        disabled={newProjectName.trim().length === 0}
                        onClick={() => onCreateProject(newProjectName, newProjectDescription, isPrivate)}
                    >
                        Create
                    </Button>
                    <Button variant="ghost" color="danger" onClick={onCancel}>
                        Cancel
                    </Button>
                </RowLayout>
            </Dialog.Actions>
        </Dialog>
    );
};

export default CreateProjectDialog;
