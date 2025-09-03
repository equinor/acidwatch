import { ModelConfig } from "../dto/FormConfig.tsx";
import React from "react";
import { Accordion, Typography } from "@equinor/eds-core-react";

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

const ModelDescription: React.FC<{ model?: ModelConfig }> = ({ model }) => {
    if (!model) return null;

    return <Description name={model.displayName ?? model.modelId} text={model.description} />;
};

export default ModelDescription;
