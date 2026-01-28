import React, { ChangeEvent, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import ConvertibleTextField from "../ConvertibleTextField";
import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map";
import { MetaTooltip } from "@/functions/Tooltip";
import { Columns } from "@/components/styles";
import { useModelInputStore } from "@/hooks/useModelInputStore";
import { useShallow } from "zustand/react/shallow";
import { ModelInput } from "@/dto/SimulationInput";

const PPM_MAX = 1000000;

function optionName(option: string): string {
    const mappedValue = FORMULA_TO_NAME_MAPPER[option];

    return mappedValue ? `${option} (${mappedValue})` : option;
}

function SubstanceAdder({ invisible, onAdd }: { invisible: string[]; onAdd: (subst: string) => void }) {
    const [selected, setSelected] = useState<string | null>(null);

    if (invisible.length === 0) return;
    return (
        <div style={{ display: "flex", alignItems: "center", marginTop: "1em" }}>
            <Autocomplete
                style={{ flexGrow: 1 }}
                id="newConcentration"
                label=""
                placeholder="Add new"
                options={invisible}
                onOptionsChange={({ selectedItems }) => setSelected(selectedItems[0])}
                selectedOptions={selected === null ? [] : [selected]}
                optionLabel={optionName}
            />
            <Button
                onClick={() => {
                    onAdd(selected!);
                    setSelected(null);
                }}
                disabled={selected === null}
            >
                +
            </Button>
        </div>
    );
}

function ParametersInput({
    model,
    parameters,
    setParameter,
}: {
    model: ModelConfig;
    parameters: Record<string, number>;
    setParameter: (name: string, value: any) => void;
}) {
    if (Object.keys(model.parameters).length === 0) return;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
            <Typography variant="h3"> {model.category} Parameters </Typography>
            {Object.entries(model.parameters).map(([name, config]) =>
                config.choices ? (
                    <NativeSelect
                        id={name}
                        label={config.label ?? name}
                        value={parameters[name]}
                        onChange={(e) => setParameter(name, e.target.value)}
                    >
                        {config.choices.map((choice, index) => (
                            <option key={index} value={choice}>
                                {config.optionLabels ? config.optionLabels[index] : choice}
                            </option>
                        ))}
                    </NativeSelect>
                ) : (
                    <ConvertibleTextField
                        key={name}
                        convertibleUnit={config.convertibleUnit}
                        value={parameters[name]}
                        label={config.label}
                        min={config.minimum}
                        max={config.maximum}
                        unit={config.unit}
                        meta={MetaTooltip(config.description ?? "")}
                        onValueChange={(value: number) => setParameter(name, value)}
                    />
                )
            )}
        </div>
    );
}

const ModelInputs: React.FC<{
    model: ModelConfig;
    secondaryModel?: ModelConfig;
    concentrations?: Record<string, number>;
    setConcentration: (name: string, value: number) => void;
    onSubmit: (modelInput: ModelInput) => void;
}> = ({ model, secondaryModel, concentrations = {}, setConcentration, onSubmit }) => {
    
    const { parameters, setParameter } = useModelInputStore(
        model,
        useShallow((s) => ({
            parameters: s.parameters,
            setParameter: s.setParameter,
        }))
    );

    const secondaryModelStore = useModelInputStore(
        secondaryModel ?? model,
        useShallow((s) => ({
            parameters: s.parameters,
            setParameter: s.setParameter,
        }))
    );

    const { parameters: secondaryParameters, setParameter: setSecondaryParameter } = secondaryModel
        ? secondaryModelStore
        : { parameters: undefined, setParameter: undefined };

    const invisible = model.validSubstances.filter((name) => concentrations[name] === undefined);

    return (
        <div>
            <Columns>
                <div>
                    <Typography variant="h3">Concentrations</Typography>
                    {Object.entries(concentrations).map(([name, value]) => (
                        <TextField
                            type="number"
                            key={name}
                            label={optionName(name)}
                            style={{ paddingTop: "5px" }}
                            step="any"
                            unit="ppm"
                            max={PPM_MAX}
                            value={value}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setConcentration(name, Math.min(e.target.valueAsNumber, PPM_MAX))
                            }
                        />
                    ))}
                    <SubstanceAdder invisible={invisible} onAdd={(item: string) => setConcentration(item, 0)} />
                </div>
                <ParametersInput model={model} parameters={parameters} setParameter={setParameter} />
                {secondaryModel && secondaryParameters && setSecondaryParameter && (
                    <ParametersInput
                        model={secondaryModel}
                        parameters={secondaryParameters}
                        setParameter={setSecondaryParameter}
                    />
                )}
            </Columns>
            <Button
                style={{ marginTop: "1em" }}
                onClick={() => onSubmit({ modelId: model.modelId, parameters })}
            >
                Run Simulation
            </Button>
        </div>
    );
};

export default ModelInputs;
