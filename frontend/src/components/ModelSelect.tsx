import React, { useState } from "react";
import { Button, Dialog, Icon, Typography } from "@equinor/eds-core-react";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { help } from "@equinor/eds-icons";

const makeLabel = (modelConfig: ModelConfig) =>
    modelConfig.accessError ? `{modelConfig.displayName} (Access Error)` : modelConfig.displayName;

const PrimaryModelButton: React.FC<{
    modelConfig: ModelConfig;
    active?: boolean;
    setCurrentPrimaryModel: (modelConfig: ModelConfig) => void;
}> = ({ modelConfig, active, setCurrentPrimaryModel }) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <Button.Group>
            <Button
                variant={active ? "outlined" : "contained"}
                onClick={() => {
                    setCurrentPrimaryModel(modelConfig);
                }}
                disabled={!!modelConfig.accessError}
            >
                {makeLabel(modelConfig)}
            </Button>
            <Button variant={"contained"} onClick={() => setOpen(true)}>
                <Icon data={help} />
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} isDismissable={true} style={{ width: "100%" }}>
                <Dialog.Header>
                    <Dialog.Title>Model {modelConfig.displayName}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Content style={{ whiteSpace: "pre-wrap" }}>{modelConfig.description}</Dialog.Content>
            </Dialog>
        </Button.Group>
    );
};

const SecondaryModelButton: React.FC<{
    modelConfig: ModelConfig;
    active?: boolean;
    setCurrentSecondaryModel: (modelConfig: ModelConfig) => void;
}> = ({ modelConfig, active, setCurrentSecondaryModel }) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <Button.Group>
            <Button
                variant={active ? "outlined" : "contained"}
                onClick={() => {
                    setCurrentSecondaryModel(modelConfig);
                }}
                disabled={!!modelConfig.accessError}
            >
                {makeLabel(modelConfig)}
            </Button>
            <Button variant={"contained"} onClick={() => setOpen(true)}>
                <Icon data={help} />
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} isDismissable={true} style={{ width: "100%" }}>
                <Dialog.Header>
                    <Dialog.Title>Model {modelConfig.displayName}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Content style={{ whiteSpace: "pre-wrap" }}>{modelConfig.description}</Dialog.Content>
            </Dialog>
        </Button.Group>
    );
};

const ModelSelect: React.FC<{
    currentPrimaryModel?: ModelConfig;
    setCurrentPrimaryModel: (model: ModelConfig) => void;
    currentSecondaryModel?: ModelConfig;
    setCurrentSecondaryModel: (model: ModelConfig) => void;
}> = ({ currentPrimaryModel, currentSecondaryModel, setCurrentPrimaryModel, setCurrentSecondaryModel }) => {
    const { models, error, isLoading } = useAvailableModels();

    if (isLoading) {
        return (
            <Typography variant="body_short" bold>
                Fetching models...
            </Typography>
        );
    } else if (!models) {
        return (
            <>
                <Typography variant="body_short" bold color="danger">
                    Error: Could not fetch models
                </Typography>
                {error && <Typography variant="body_long">{error.message}</Typography>}
            </>
        );
    }

    return (
        <>
            <Typography variant="h6" style={{ marginBottom: "8px" }}>
                Primary Models
            </Typography>
            <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {models
                        .filter((model) => model.category === "Primary")
                        .map((model, index) => (
                            <PrimaryModelButton
                                modelConfig={model}
                                key={index}
                                active={model.modelId === currentPrimaryModel?.modelId}
                                setCurrentPrimaryModel={setCurrentPrimaryModel}
                            />
                        ))}
                </div>
                <Typography variant="h6" style={{ margin: "24px 0 8px 0" }}>
                    Secondary Models
                </Typography>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {models
                        .filter((model) => model.category === "Secondary")
                        .map((model, index) => (
                            <SecondaryModelButton
                                modelConfig={model}
                                key={index}
                                active={model.modelId === currentSecondaryModel?.modelId}
                                setCurrentSecondaryModel={setCurrentSecondaryModel}
                            />
                        ))}
                </div>
            </div>
        </>
    );
};

export default ModelSelect;
