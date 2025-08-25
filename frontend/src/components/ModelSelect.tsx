import React from "react";
import { Accordion, Radio, Typography } from "@equinor/eds-core-react";
import { ModelConfig } from "../dto/FormConfig";
import { useAvailableModels } from "../contexts/ModelContext";

const Description: React.FC<{ name: string; text: string }> = ({ name, text }) => (
    <Accordion>
        <Accordion.Item>
            <Accordion.Header>{`Description for ${name}`}</Accordion.Header>
            <Accordion.Panel>
                <Typography as="pre" variant="body_long" style={{ whiteSpace: "pre-wrap" }}>
                    {text}
                </Typography>
            </Accordion.Panel>
        </Accordion.Item>
    </Accordion>
);

const ModelSelect: React.FC<{ currentModel?: ModelConfig; setCurrentModel: (model: ModelConfig) => void }> = ({
    currentModel,
    setCurrentModel,
}) => {
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

    function getlabel(model: ModelConfig) {
        if (model.accessError) {
            return `${model.displayName} (accesserror)`;
        }
        return model.displayName;
    }

    return (
        <div style={{ marginBottom: "20px" }}>
            <Typography bold>Select model</Typography>
            {models.map((model, index) => (
                <div key={index}>
                    <Radio
                        label={getlabel(model)}
                        name="model"
                        value={model.modelId}
                        checked={model.modelId === currentModel?.modelId}
                        onChange={() => {
                            setCurrentModel(model);
                        }}
                        disabled={!!model.accessError}
                    />
                </div>
            ))}
            {currentModel?.description && (
                <Description name={currentModel.displayName ?? currentModel.modelId} text={currentModel.description} />
            )}
        </div>
    );
};

export default ModelSelect;
