import { useEffect, useState } from "react";
import React from "react";
import ModelSelect from "../components/ModelSelect";
import { ModelConfig } from "../dto/FormConfig";
import ModelInputs from "../components/ModelInputs";
import Results from "./Results";
import { useAvailableModels } from "../contexts/ModelContext";
import { useSimulation } from "../contexts/SimulationContext";
import VGHGif from "../assets/VGH.gif";

const Models: React.FC = () => {
    const [currentModel, setCurrentModel] = useState<ModelConfig | undefined>(undefined);
    const { models } = useAvailableModels();
    const { setModelInput, simulationResults, loading } = useSimulation();

    // Set the defaulted selected model to the first without access error.
    useEffect(() => {
        if (models.length > 0 && currentModel === undefined) {
            setCurrentModel(models.find((model) => !model.accessError));
        }
    }, [models, currentModel, setCurrentModel]);

    return (
        <div style={{ display: "flex" }}>
            <div style={{ width: "300px", marginLeft: "20px" }}>
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
            </div>
            <div style={{ marginLeft: "100px" }}>
                {loading ? (
                    <img src={VGHGif} alt="Loading..." style={{ width: "120px" }} />
                ) : (
                    <Results simulationResults={simulationResults} />
                )}
            </div>
        </div>
    );
};

export default Models;
