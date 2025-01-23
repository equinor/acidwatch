import { Button, Checkbox, Dialog, Radio, Switch, TextField, Typography } from "@equinor/eds-core-react";
import { SetStateAction, useEffect, useState } from "react";
import { ColumnLayout, RowItem, RowLayout } from "./StyledLayout";
import config from "../configuration";
import { getAccessToken } from "../services/auth";
import { saveProject } from "../api/api";

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
    const [checked, updateChecked] = useState("private");
    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateChecked(event.target.value);
    };
    useEffect(() => {
        if (!isOpen) {
            setNewProjectName("");
            setNewProjectDescription("");
        }
    }, [isOpen]);

    const onCreateProject = async (name: string, description: string, isPrivate: boolean) => {
        setErrorMsg("");
        try {
            const dataId = saveProject((name = name), (description = description), (isPrivate = isPrivate));
            dataId.then((result: string) => {
                onCreatedProject(result);
            });
        } catch (e) {
            setErrorMsg("Could not save project");
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
                            onChange={(e: { target: { value: SetStateAction<string> } }) => {
                                setNewProjectName(e.target.value);
                            }}
                        />
                    </RowItem>
                    <RowItem>
                        <TextField
                            id="description"
                            label="Description"
                            value={newProjectDescription}
                            onChange={(e: { target: { value: SetStateAction<string> } }) => {
                                setNewProjectDescription(e.target.value);
                            }}
                        />
                    </RowItem>
                    <RowItem>
                        <Radio
                            label="Private Project"
                            name="group"
                            value="private"
                            checked={checked === "private"}
                            onChange={onChange}
                        />
                        <Radio
                            label="Internal Project"
                            name="group"
                            value="internal"
                            checked={checked === "internal"}
                            onChange={onChange}
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
                        onClick={() => onCreateProject(newProjectName, newProjectDescription, checked === "private")}
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
