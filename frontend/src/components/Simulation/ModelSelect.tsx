import React, { useState } from "react";
import { Button, Dialog, Icon, Typography } from "@equinor/eds-core-react";
import { ModelConfig } from "@/dto/FormConfig";
import { useAvailableModels } from "@/contexts/ModelContext";
import { help } from "@equinor/eds-icons";
import { ModelsByCategory } from "@/hooks/useModelSelection";

const makeLabel = (modelConfig: ModelConfig) =>
    modelConfig.accessError ? `${modelConfig.displayName} (Access Error)` : modelConfig.displayName;

const handleToggle = (
    isActive: boolean,
    setModel: (modelConfig: ModelConfig | undefined) => void,
    modelConfig: ModelConfig
) => {
    if (isActive) {
        // If currently active, unselect it
        setModel(undefined);
    } else {
        // If not active, select it
        setModel(modelConfig);
    }
};

const ModelButton: React.FC<{
    modelConfig: ModelConfig;
    active: boolean;
    onToggle: (modelConfig: ModelConfig | undefined) => void;
}> = ({ modelConfig, active, onToggle }) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <Button.Group>
            <Button
                variant={active ? "outlined" : "contained"}
                onClick={() => {
                    handleToggle(active, onToggle, modelConfig);
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
    selectedModels: ModelsByCategory;
    setModelForCategory: (category: string, model: ModelConfig | undefined) => void;
}> = ({ selectedModels, setModelForCategory }) => {
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

    // Group models by category
    const modelsByCategory = models.reduce(
        (acc, model) => {
            if (!acc[model.category]) {
                acc[model.category] = [];
            }
            acc[model.category].push(model);
            return acc;
        },
        {} as Record<string, ModelConfig[]>
    );

    return (
        <>
            {Object.entries(modelsByCategory).map(([category, categoryModels]) => (
                <div key={category} style={{ marginBottom: "20px" }}>
                    <Typography variant="h6" style={{ marginBottom: "8px" }}>
                        {category} Models
                    </Typography>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        {categoryModels.map((model, index) => (
                            <ModelButton
                                modelConfig={model}
                                key={index}
                                active={selectedModels[model.category]?.modelId === model.modelId}
                                onToggle={(m) => setModelForCategory(category, m)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
};

export default ModelSelect;
