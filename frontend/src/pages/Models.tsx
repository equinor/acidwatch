import { useEffect, useState } from "react";
import React from "react";
import ModelSelect from "@/components/ModelSelect";
import { ModelConfig } from "@/dto/FormConfig";
import ModelInputs from "@/components/ModelInputs";
import Results from "./Results";
import { useAvailableModels } from "@/contexts/ModelContext";
import { useSimulation } from "@/contexts/SimulationContext";
import VGHGif from "@/assets/VGH.gif";
import SaveResult from "@/components/SaveResult";
import { SimulationResults } from "@/dto/SimulationResults";
import ModelDescription from "@/components/ModelDescription.tsx";
import styled from "styled-components";

const mediaLarge = "@media (min-width: 768px)";

const Container = styled.div`
    display: flex;
    width: 100%;
    flex-direction: column;

    ${mediaLarge} {
        flex-direction: row;
        gap: 1rem;
    }
`;

const Side = styled.div`
    ${mediaLarge} {
        width: 368px;
    }
`;

const Main = styled.div`
    width: 100%;
`;

const Models: React.FC = () => {
    const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
    const { models } = useAvailableModels();
    const { setModelInput, simulationResults, loading, modelInput } = useSimulation();

    // Set the defaulted selected model to the first without access error.
    useEffect(() => {
        if (models.length > 0 && currentModel === undefined) {
            setCurrentModel(models.find((model) => !model.accessError));
        }
    }, [models, currentModel, setCurrentModel]);
    return (
        <Container>
            <Side>
                <ModelSelect currentModel={currentModel} setCurrentModel={setCurrentModel} />
                {/* For simplicity we create an input component per model, and show/hide on selection.
                    This makes statemanagement easier within the ModelInput, as we need to take care of quite
                    a bit of state. Otherwise it would have to all been stored in some context provider on top level.*/}
                {models.map((model) => (
                    <ModelInputs
                        key={model.modelId}
                        model={model}
                        visible={model.modelId === currentModel?.modelId}
                        onSubmit={(concentrations, parameters) =>
                            setModelInput({ modelId: model.modelId, concentrations, parameters })
                        }
                    />
                ))}
                {simulationResults && (
                    <>
                        <SaveResult
                            props={{
                                parameters: modelInput?.parameters || {},
                                selectedModel: currentModel?.displayName || "",
                                result: simulationResults ?? ({} as SimulationResults),
                            }}
                        />
                    </>
                )}
            </Side>
            <Main>
                <ModelDescription model={currentModel} />
                {loading ? (
                    <img src={VGHGif} alt="Loading..." style={{ width: "120px" }} />
                ) : (
                    <Results simulationResults={simulationResults} />
                )}
            </Main>
        </Container>
    );
};

export default Models;
