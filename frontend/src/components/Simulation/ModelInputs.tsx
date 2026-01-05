import React, { ChangeEvent, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import ConvertibleTextField from "../ConvertibleTextField";
import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map";
import { MetaTooltip } from "@/functions/Tooltip";
import { Columns } from "@/components/styles";
import { useModelInputStore } from "@/hooks/useModelInputStore";
import { useShallow } from "zustand/react/shallow";
import { ModelInput } from "@/dto/ModelInput";

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
    secondaryModel,
    parameters,
    setParameter,
    secondaryParameters,
    setSecondaryParameter,
}: {
    model: ModelConfig;
    secondaryModel?: ModelConfig;
    parameters: Record<string, number>;
    secondaryParameters?: Record<string, number>;
    setSecondaryParameter?: (name: string, value: any) => void;
    setParameter: (name: string, value: any) => void;
}) {
    if (!model.parameters) return;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
            <Typography variant="h3"> Parameters </Typography>
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
            {secondaryModel?.parameters && (
                <>
                    <Typography variant="h3" style={{ marginTop: "16px" }}>
                        Secondary Model Parameters
                    </Typography>
                    {Object.entries(secondaryModel.parameters).map(([name, config]) =>
                        config.choices ? (
                            <NativeSelect
                                id={name}
                                label={config.label ?? name}
                                value={secondaryParameters![name]}
                                onChange={(e) => setSecondaryParameter!(name, e.target.value)}
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
                                value={secondaryParameters![name]}
                                label={config.label}
                                min={config.minimum}
                                max={config.maximum}
                                unit={config.unit}
                                meta={MetaTooltip(config.description ?? "")}
                                onValueChange={(value: number) => setSecondaryParameter!(name, value)}
                            />
                        )
                    )}
                </>
            )}
        </div>
    );
}

const ModelInputs: React.FC<{
    model: ModelConfig;
    secondaryModel?: ModelConfig;
    onSubmit: (modelInput: ModelInput) => void;
}> = ({ model, secondaryModel, onSubmit }) => {
    const { concentrations, parameters, setConcentration, setParameter } = useModelInputStore(
        model,
        useShallow((s) => ({
            concentrations: s.concentrations,
            parameters: s.parameters,
            setConcentration: s.setConcentration,
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
                <ParametersInput
                    model={model}
                    parameters={parameters}
                    setParameter={setParameter}
                    secondaryModel={secondaryModel}
                    secondaryParameters={secondaryParameters}
                    setSecondaryParameter={setSecondaryParameter}
                />
            </Columns>
            <Button
                style={{ marginTop: "1em" }}
                onClick={() => onSubmit({ modelId: model.modelId, concentrations, parameters })}
            >
                Run Simulation
            </Button>
        </div>
    );
};

export default ModelInputs;
