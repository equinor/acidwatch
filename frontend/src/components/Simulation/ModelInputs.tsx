import React, { ChangeEvent, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map";
import { MetaTooltip } from "@/functions/Tooltip";
import ConvertibleTextField from "@/components/ConvertibleTextField";
import { Columns } from "@/components/styles";
import { useModelInputStore, getModelInputStore } from "@/hooks/useModelInputStore";
import { useShallow } from "zustand/react/shallow";
import { ModelInput } from "@/dto/ModelInput";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { sortModelsByCategory } from "@/utils/modelUtils";

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
            <Typography variant="h3">{model.displayName} Parameters</Typography>
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
                        id={name}
                        key={name}
                        value={parameters[name]}
                        label={config.label}
                        min={config.minimum}
                        max={config.maximum}
                        unit={config.unit}
                        meta={MetaTooltip(config.description ?? "")}
                        onValueChange={(v) => setParameter(name, v)}
                    />
                )
            )}
        </div>
    );
}

function ModelParametersWrapper({ model }: { model: ModelConfig }) {
    const { parameters, setParameter } = useModelInputStore(
        model,
        useShallow((s) => ({
            parameters: s.parameters,
            setParameter: s.setParameter,
        }))
    );

    return <ParametersInput model={model} parameters={parameters} setParameter={setParameter} />;
}

const ModelInputs: React.FC<{
    selectedModels: ModelConfig[];
    onSubmit: (modelInput: ModelInput) => void;
}> = ({ selectedModels, onSubmit }) => {
    const { concentrations, setConcentration } = useConcentrationsStore(
        useShallow((s) => ({
            concentrations: s.concentrations,
            setConcentration: s.setConcentration,
        }))
    );
    const { conditions, setCondition } = useConditionsStore(
        useShallow((s) => ({
            conditions: s.conditions,
            setCondition: s.setCondition,
        }))
    );

    const firstModelValidSubstances =
        selectedModels.length > 0 ? new Set(selectedModels[0].validSubstances) : new Set<string>();

    const allValidSubstances = new Set(selectedModels.flatMap((m) => m.validSubstances));
    const invisible = Array.from(allValidSubstances).filter((name) => concentrations[name] === undefined);

    const handleSubmit = () => {
        const validConcentrations = Object.fromEntries(
            Object.entries(concentrations).filter(
                ([substance]) => selectedModels.length === 0 || firstModelValidSubstances.has(substance)
            )
        );

        const models = sortModelsByCategory(selectedModels).map((model) => {
            const store = getModelInputStore(model);
            const parameters = store.getState().parameters;
            return {
                modelId: model.modelId,
                parameters: parameters,
            };
        });

        onSubmit({ concentrations: validConcentrations, conditions, models });
    };

    const hasInvalidSubstances = Object.keys(concentrations).some(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );
    const hasNoValidSubstances = Object.keys(concentrations).every(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );

    return (
        <div>
            <Columns>
                <div>
                    <Typography variant="h3">Concentrations</Typography>
                    {Object.entries(concentrations).map(([name, value]) => {
                        const invalid = selectedModels.length > 0 && !firstModelValidSubstances.has(name);

                        return (
                            <TextField
                                type="number"
                                key={name}
                                label={optionName(name)}
                                style={{
                                    paddingTop: "5px",
                                    opacity: invalid ? 0.6 : 1,
                                }}
                                step="any"
                                unit="ppm"
                                max={PPM_MAX}
                                value={value}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setConcentration(name, Math.min(e.target.valueAsNumber, PPM_MAX))
                                }
                                helperText={invalid ? "⚠️ Not supported by selected models" : undefined}
                                variant={invalid ? "error" : undefined}
                            />
                        );
                    })}
                    <SubstanceAdder invisible={invisible} onAdd={(item: string) => setConcentration(item, 0)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <Typography variant="h3">Conditions</Typography>
                    <ConvertibleTextField
                        id="temperature"
                        label="Temperature"
                        unit="°C"
                        min={-73}
                        max={127}
                        value={conditions.temperature}
                        onValueChange={(v) => setCondition("temperature", v)}
                    />
                    <ConvertibleTextField
                        id="pressure"
                        label="Pressure"
                        unit="bara"
                        min={1}
                        max={300}
                        value={conditions.pressure}
                        onValueChange={(v) => setCondition("pressure", v)}
                    />
                </div>
                {selectedModels.map((model) => (
                    <ModelParametersWrapper key={model.modelId} model={model} />
                ))}
            </Columns>
            {hasInvalidSubstances && (
                <Typography
                    variant="body_short"
                    style={{ marginTop: "1em", color: "var(--eds_interactive_warning__text, #ff9200)" }}
                >
                    ⚠️ Some substances are not supported by the first model and will be excluded from the simulation.
                </Typography>
            )}
            <Button
                style={{ marginTop: "1em" }}
                onClick={handleSubmit}
                disabled={hasNoValidSubstances || selectedModels.length === 0}
            >
                Run Simulation
            </Button>
        </div>
    );
};

export default ModelInputs;
