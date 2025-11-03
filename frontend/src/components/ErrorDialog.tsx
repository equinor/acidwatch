// frontend/src/components/ErrorDialog.tsx
import React from "react";
import { Dialog as EDS_Dialog, Button, Typography } from "@equinor/eds-core-react";
import { useErrorStore } from "@/hooks/useErrorState";

const ErrorDialog: React.FC = () => {
    const { error, setError } = useErrorStore();

    const handleClose = () => {
        setError(null);
    };

    return (
        <EDS_Dialog open={!!error} onClose={handleClose}>
            <EDS_Dialog.Header>
                <EDS_Dialog.Title>Error</EDS_Dialog.Title>
            </EDS_Dialog.Header>
            <EDS_Dialog.CustomContent>
                <Typography>{error}</Typography>
            </EDS_Dialog.CustomContent>
            <EDS_Dialog.Actions>
                <Button onClick={handleClose}>Close</Button>
            </EDS_Dialog.Actions>
        </EDS_Dialog>
    );
};

export default ErrorDialog;
