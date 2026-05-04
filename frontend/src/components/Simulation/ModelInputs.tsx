import React, { ChangeEvent, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import ConvertibleTextField from "../ConvertibleTextField";
import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map";
import { MetaTooltip } from "@/functions/Tooltip";
import { Columns } from "@/components/styles";
import { useModelInputStore, getModelInputStore } from "@/hooks/useModelInputStore";
import { useShallow } from "zustand/react/shallow";
import { ModelInput } from "@/dto/ModelInput";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { sortModelsByCategory } from "@/utils/modelUtils";

const PPM_MAX = 1000000;

// Compute the intersection of optional [min, max] ranges across selected models.
function intersectRanges(
    ranges: (readonly [number, number] | null | undefined)[]
): [number, number] | null | undefined {
    const present = ranges.filter((r): r is readonly [number, number] => Array.isArray(r));
    if (present.length === 0) return null;
    const min = Math.max(...present.map(([lo]) => lo));
    const max = Math.min(...present.map(([, hi]) => hi));
    return min <= max ? [min, max] : undefined;
}

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
    const { temperature, pressure, setTemperature, setPressure } = useConditionsStore(
        useShallow((s) => ({
            temperature: s.temperature,
            pressure: s.pressure,
            setTemperature: s.setTemperature,
            setPressure: s.setPressure,
        }))
    );

    const temperatureRange = intersectRanges(selectedModels.map((m) => m.temperatureRange));
    const pressureRange = intersectRanges(selectedModels.map((m) => m.pressureRange));

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

        onSubmit({
            concentrations: validConcentrations,
            // Only send conditions when at least one selected model consumes them.
            temperature: temperatureRange !== null ? temperature : null,
            pressure: pressureRange !== null ? pressure : null,
            models,
        });
    };

    const hasInvalidSubstances = Object.keys(concentrations).some(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );
    const hasNoValidSubstances = Object.keys(concentrations).every(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );

    // null  → no selected model uses this condition (hide input)
    // undefined → selected models have no overlapping range (show error)
    // tuple → intersection of allowed ranges across selected models
    const showTemperature = temperatureRange !== null;
    const showPressure = pressureRange !== null;
    const showConditions = showTemperature || showPressure;
    const hasEmptyRangeIntersection = temperatureRange === undefined || pressureRange === undefined;

    const conditionsOutOfRange =
        (temperatureRange && (temperature < temperatureRange[0] || temperature > temperatureRange[1])) ||
        (pressureRange && (pressure < pressureRange[0] || pressure > pressureRange[1]));

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
                {showConditions && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Typography variant="h3">Conditions</Typography>
                        {showTemperature && (
                            <ConvertibleTextField
                                convertibleUnit="kelvin"
                                value={temperature}
                                label="Temperature"
                                min={temperatureRange?.[0]}
                                max={temperatureRange?.[1]}
                                meta={MetaTooltip(
                                    temperatureRange
                                        ? `Allowed range: ${temperatureRange[0]}–${temperatureRange[1]} K (intersection of selected models)`
                                        : "Selected models have no overlapping temperature range"
                                )}
                                onValueChange={(value: number) => setTemperature(value)}
                            />
                        )}
                        {showPressure && (
                            <ConvertibleTextField
                                value={pressure}
                                label="Pressure"
                                unit="bara"
                                min={pressureRange?.[0]}
                                max={pressureRange?.[1]}
                                meta={MetaTooltip(
                                    pressureRange
                                        ? `Allowed range: ${pressureRange[0]}–${pressureRange[1]} bara (intersection of selected models)`
                                        : "Selected models have no overlapping pressure range"
                                )}
                                onValueChange={(value: number) => setPressure(value)}
                            />
                        )}
                    </div>
                )}
                {selectedModels.map((model) => (
                    <ModelParametersWrapper key={model.modelId} model={model} />
                ))}
            </Columns>
            {showConditions && hasEmptyRangeIntersection && (
                <Typography
                    variant="body_short"
                    style={{ marginTop: "1em", color: "var(--eds_interactive_danger__text, #eb0037)" }}
                >
                    ⚠️ Selected models have no overlapping temperature/pressure range. Pick a different combination.
                </Typography>
            )}
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
                disabled={
                    hasNoValidSubstances ||
                    selectedModels.length === 0 ||
                    (showConditions && hasEmptyRangeIntersection) ||
                    !!conditionsOutOfRange
                }
            >
                Run Simulation
            </Button>
        </div>
    );
};

export default ModelInputs;
