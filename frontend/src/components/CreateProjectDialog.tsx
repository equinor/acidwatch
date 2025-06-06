import { Button, Dialog, Radio, TextField, Typography } from "@equinor/eds-core-react";
import { SetStateAction, useState } from "react";
import { ColumnLayout, RowItem, RowLayout } from "./StyledLayout";
import { saveProject } from "../api/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CreateProjectDialog: React.FC<{ setCreateProjectDialogOpen: React.Dispatch<React.SetStateAction<boolean>> }> = ({
    setCreateProjectDialogOpen,
}) => {
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [checked, updateChecked] = useState("private");
    const queryClient = useQueryClient();
    const saveProjectMutation = useMutation({
        mutationFn: ({ name, description, isPrivate }: { name: string; description: string; isPrivate: boolean }) =>
            saveProject(name, description, isPrivate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            setCreateProjectDialogOpen(false);
        },
        onError: () => setErrorMsg("Could not save project"),
    });

    const onRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateChecked(event.target.value);
    };

    const onCreateProject = async (name: string, description: string, isPrivate: boolean) => {
        saveProjectMutation.mutate({ name, description, isPrivate });
    };

    return (
        <Dialog
            data-testid="test-dialog"
            open={true}
            isDismissable={true}
            onClose={undefined}
            style={{ minWidth: "25vw", overflow: "auto" }}
        >
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
                            onChange={onRadioChange}
                        />
                        <Radio
                            label="Internal Project"
                            name="group"
                            value="internal"
                            checked={checked === "internal"}
                            onChange={onRadioChange}
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
                    <Button
                        data-testid="CancelButton"
                        variant="ghost"
                        color="danger"
                        onClick={() => setCreateProjectDialogOpen(false)}
                    >
                        Cancel
                    </Button>
                </RowLayout>
            </Dialog.Actions>
        </Dialog>
    );
};

export default CreateProjectDialog;
