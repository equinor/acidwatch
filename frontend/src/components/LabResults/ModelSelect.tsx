import { useAvailableModels } from "@/contexts/ModelContext";
import { ModelConfig } from "@/dto/FormConfig";
import { Button, ButtonProps, Checkbox, Dialog, Icon } from "@equinor/eds-core-react";
import { settings } from "@equinor/eds-icons";
import React, { useState } from "react";

type Props = {
    selectedModels: Set<ModelConfig>;
    setModels: (models: Set<ModelConfig>) => void;
} & ButtonProps;

export const ModelSelect: React.FC<Props> = ({ selectedModels, setModels, ...rest }) => {
    const { models } = useAvailableModels();
    const [open, setOpen] = useState(false);

    const onToggleAll = () => {
        if (selectedModels.size === 0) {
            setModels(new Set(models));
        } else {
            setModels(new Set());
        }
    };

    const onToggle = (model: ModelConfig) => {
        const newSelected = new Set(selectedModels);
        if (selectedModels.has(model)) {
            newSelected.delete(model);
        } else {
            newSelected.add(model);
        }
        setModels(newSelected);
    };

    return (
        <>
            <Button aria-haspopup="dialog" onClick={() => setOpen(!open)} {...rest}>
                <Icon data={settings} />
            </Button>
            <Dialog style={{ minWidth: "30rem" }} open={open} onClose={() => setOpen(false)} isDismissable>
                <Dialog.Header>
                    <Dialog.Title>Select of models for simulation</Dialog.Title>
                </Dialog.Header>
                <Dialog.Content style={{ gap: "1rem", display: "grid" }}>
                    {models
                        .filter((model) => model.category === "ChemicalEquilibrium")
                        .map((model) => (
                            <Checkbox
                                key={model.modelId}
                                label={model.displayName}
                                checked={selectedModels.has(model)}
                                onChange={() => onToggle(model)}
                                disabled={model.accessError !== null}
                            />
                        ))}
                </Dialog.Content>
                <Dialog.Actions style={{ display: "flex", gap: "1rem" }}>
                    <Button onClick={() => setOpen(false)}>OK</Button>
                    <Button onClick={onToggleAll} variant="ghost">
                        {selectedModels.size === 0 ? "Select all" : "Deselect all"}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </>
    );
};
