import React, { useState, useEffect } from "react";
import { Dialog, Button, Typography } from "@equinor/eds-core-react";
import { PeoplePicker } from "@microsoft/mgt-react";
import { Providers, ProviderState } from "@microsoft/mgt-element";
import { addUsers, getProjects } from "../api/api";

interface ShareProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({ isOpen, onClose, projectId }) => {
    const [selectedPeople, setSelectedPeople] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const provider = Providers.globalProvider;
    useEffect(() => {
        setExistingPeople();
    }, []);

    const setExistingPeople = async () => {
        const projects = await getProjects();
        const projectData = projects.find((item) => item.id === projectId);
        if (projectData) {
            
            const userIds = projectData.access_ids;
            const provider = Providers.globalProvider;
            const graphClient = provider.graph.client;
            const users = await Promise.all(
                userIds.map(async (id) => {
                    const user = await graphClient.api(`/users/${id}`).get();
                    return {
                        displayName: user.displayName,
                        mail: user.mail,
                        id: user.id,
                    };
                })
            );
            const validUsers = users.filter((user) => user !== null);
            setSelectedPeople(validUsers);
        }
    };

    const handleSelectionChanged = (e: any) => {
        console.log("Selected people:", e.detail);
        setSelectedPeople(e.detail);
    };

    const handleUpdateAccess = () => {
        addUsers(
            projectId,
            selectedPeople.map((user) => user.id)
        );
        setExistingPeople();
        window.location.reload();
        onClose();
    };

    const handleClose = () => {
        setExistingPeople();
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} style={{ width: "450px", height: "350px" }}>
            <Dialog.Header>
                <Dialog.Title>Project access</Dialog.Title>
            </Dialog.Header>
            <Dialog.CustomContent>
                {provider && provider.state === ProviderState.SignedIn ? (
                    <>
                        <PeoplePicker
                            selectedPeople={selectedPeople}
                            selectionChanged={handleSelectionChanged}
                            showMax={5}
                        />
                        {error && <Typography color="danger">{error}</Typography>}
                    </>
                ) : (
                    <Typography color="danger">Please sign in to search for users.</Typography>
                )}
            </Dialog.CustomContent>
            <Dialog.Actions>
                <Button onClick={handleUpdateAccess} style={{ marginRight: "8px" }}>
                    Update access
                </Button>
                <Button onClick={handleClose}>Close</Button>
            </Dialog.Actions>
        </Dialog>
    );
};

export default ShareProjectDialog;
