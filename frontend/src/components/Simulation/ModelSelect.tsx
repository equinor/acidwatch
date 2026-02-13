import React, { useState } from "react";
import { Button, Dialog, Icon, Typography } from "@equinor/eds-core-react";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { help } from "@equinor/eds-icons";
import { sortModelsByCategory } from "@/utils/modelUtils";

const makeLabel = (modelConfig: ModelConfig) => {
    return modelConfig.accessError ? `${modelConfig.displayName} (Access Error)` : modelConfig.displayName;
};

const ModelButton: React.FC<{
    modelConfig: ModelConfig;
    isActive: boolean;
    onToggle: () => void;
}> = ({ modelConfig, isActive, onToggle }) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <Button.Group>
            <Button
                variant={isActive ? "outlined" : "contained"}
                onClick={onToggle}
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
    selectedModels: ModelConfig[];
    setSelectedModels: (models: ModelConfig[]) => void;
}> = ({ selectedModels, setSelectedModels }) => {
    const { models, error, isLoading } = useAvailableModels();

    const handleToggle = (modelConfig: ModelConfig) => {
        const index = selectedModels.findIndex((m) => m.modelId === modelConfig.modelId);
        if (index !== -1) {
            // Deselect the model
            setSelectedModels(selectedModels.filter((_, i) => i !== index));
        } else {
            // Replace any existing model of the same category and maintain correct order
            const filteredModels = selectedModels.filter((m) => m.category !== modelConfig.category);
            setSelectedModels(sortModelsByCategory([...filteredModels, modelConfig]));
        }
    };

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
                        .map((model, index) => {
                            const isActive = selectedModels.some((m) => m.modelId === model.modelId);
                            return (
                                <ModelButton
                                    modelConfig={model}
                                    key={index}
                                    isActive={isActive}
                                    onToggle={() => handleToggle(model)}
                                />
                            );
                        })}
                </div>
                <Typography variant="h6" style={{ margin: "24px 0 8px 0" }}>
                    Secondary Models
                </Typography>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {models
                        .filter((model) => model.category === "Secondary")
                        .map((model, index) => {
                            const isActive = selectedModels.some((m) => m.modelId === model.modelId);
                            return (
                                <ModelButton
                                    modelConfig={model}
                                    key={index}
                                    isActive={isActive}
                                    onToggle={() => handleToggle(model)}
                                />
                            );
                        })}
                </div>
            </div>
        </>
    );
};

export default ModelSelect;
