import React, { useState, useEffect } from "react";
import { Dialog, Button, Typography } from "@equinor/eds-core-react";
import { PeoplePicker } from "@microsoft/mgt-react";
import { Providers, ProviderState } from "@microsoft/mgt-element";
import { addUsers } from "../api/api";

interface ShareProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({ isOpen, onClose, projectId }) => {
    const [selectedPeople, setSelectedPeople] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const provider = Providers.globalProvider;
    const checkProviderState = () => {
        if (provider) {
            console.log("Provider state:", provider.state);
            if (provider.state === ProviderState.SignedIn) {
                console.log("Provider is signed in");
            } else if (provider.state === ProviderState.SignedOut) {
                console.log("Provider is signed out");
            } else if (provider.state === ProviderState.Loading) {
                console.log("Provider is loading");
            }
        } else {
            console.error("Provider not initialized");
        }
    };

    checkProviderState();

    const handleSelectionChanged = (e: any) => {
        console.log("Selected people:", e.detail);
        setSelectedPeople(e.detail);
    };

    const handleAddUsers = () => {
        addUsers(
            projectId,
            selectedPeople.map((user) => user.id)
        );
    };

    return (
        <Dialog open={isOpen} onClose={onClose} style={{ width: "450px", height: "350px" }}>
            <Dialog.Header>
                <Dialog.Title>Share project</Dialog.Title>
            </Dialog.Header>
            <Dialog.CustomContent>
                {provider && provider.state === ProviderState.SignedIn ? (
                    <>
                        <PeoplePicker selectionChanged={handleSelectionChanged} showMax={5} />
                        {error && <Typography color="danger">{error}</Typography>}
                    </>
                ) : (
                    <Typography color="danger">Please sign in to search for users.</Typography>
                )}
            </Dialog.CustomContent>
            <Dialog.Actions>
                <Button onClick={handleAddUsers} style={{ marginRight: "8px" }}>
                    Add users
                </Button>
                <Button onClick={onClose}>Close</Button>
            </Dialog.Actions>
        </Dialog>
    );
};

export default ShareProjectDialog;
