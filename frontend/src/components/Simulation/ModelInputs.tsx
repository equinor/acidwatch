import React, { ChangeEvent, useEffect, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Accordion, Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import { MetaTooltip } from "@/functions/Tooltip";
import ConvertibleTextField from "@/components/ConvertibleTextField";
import { Columns } from "@/components/styles";
import { useModelInputStore, getModelInputStore } from "@/hooks/useModelInputStore";
import { useShallow } from "zustand/react/shallow";
import { ModelInput } from "@/dto/ModelInput";
import { useConcentrationsStore } from "@/hooks/useConcentrationsStore";
import { useConditionsStore } from "@/hooks/useConditionsStore";
import { sortModelsByCategory } from "@/utils/modelUtils";
import { CreateGridSimulation } from "@/dto/GridSimulation";
import { useGridRangeStore } from "@/hooks/useGridRangeStore";
import { optionName } from "@/functions/Substance";

const PPM_MAX = 1000000;

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

function GridRangeInput({ candidateSubstances }: { candidateSubstances: string[] }) {
    const { axes, addAxis, removeAxis, updateAxis } = useGridRangeStore(
        useShallow((s) => ({
            axes: s.axes,
            addAxis: s.addAxis,
            removeAxis: s.removeAxis,
            updateAxis: s.updateAxis,
        }))
    );

    const axis = axes[0];
    const isActive = axis !== undefined;

    const [minStr, setMinStr] = useState(axis?.range.min.toString() ?? "");
    const [maxStr, setMaxStr] = useState(axis?.range.max.toString() ?? "");
    const [stepStr, setStepStr] = useState(axis?.range.step.toString() ?? "");

    useEffect(() => {
        if (axis) {
            setMinStr(axis.range.min.toString());
            setMaxStr(axis.range.max.toString());
            setStepStr(axis.range.step.toString());
        }
    }, [axis?.substance]);

    const commitRange = (field: "min" | "max" | "step", raw: string) => {
        if (!axis) return;
        const v = Number(raw);
        if (Number.isNaN(v)) return;
        updateAxis(0, { range: { ...axis.range, [field]: v } });
    };

    const headerText = "Concentration range";

    return (
        <Accordion className="transparent-accordion">
            <Accordion.Item isExpanded={isActive}>
                <Accordion.Header>{headerText}</Accordion.Header>
                <Accordion.Panel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 0" }}>
                        <NativeSelect
                            id="gridAxis0"
                            label="Substance"
                            value={axis?.substance ?? ""}
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    if (isActive) removeAxis(0);
                                } else if (isActive) {
                                    updateAxis(0, { substance: e.target.value });
                                } else {
                                    addAxis(e.target.value);
                                }
                            }}
                        >
                            <option value="">None (single run)</option>
                            {candidateSubstances.map((substance) => (
                                <option key={substance} value={substance}>
                                    {optionName(substance)}
                                </option>
                            ))}
                        </NativeSelect>
                        {isActive && (
                            <>
                                <TextField
                                    id="gridMin0"
                                    type="number"
                                    label="From"
                                    unit="ppm"
                                    step="any"
                                    min={0}
                                    max={PPM_MAX}
                                    value={minStr}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMinStr(e.target.value)}
                                    onBlur={() => commitRange("min", minStr)}
                                    variant={axis.range.max > axis.range.min ? undefined : "error"}
                                />
                                <TextField
                                    id="gridMax0"
                                    type="number"
                                    label="To"
                                    unit="ppm"
                                    step="any"
                                    min={0}
                                    max={PPM_MAX}
                                    value={maxStr}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxStr(e.target.value)}
                                    onBlur={() => commitRange("max", maxStr)}
                                    variant={axis.range.max > axis.range.min ? undefined : "error"}
                                    helperText={
                                        axis.range.max > axis.range.min ? undefined : "'To' must be greater than 'From'"
                                    }
                                />
                                <TextField
                                    id="gridStep0"
                                    type="number"
                                    label="Step"
                                    unit="ppm"
                                    step="any"
                                    min={0.001}
                                    value={stepStr}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStepStr(e.target.value)}
                                    onBlur={() => commitRange("step", stepStr)}
                                />
                            </>
                        )}
                    </div>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
}

const ModelInputs: React.FC<{
    selectedModels: ModelConfig[];
    onSubmit: (modelInput: ModelInput) => void;
    onRunGrid: (grid: CreateGridSimulation) => void;
}> = ({ selectedModels, onSubmit, onRunGrid }) => {
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
    const gridAxes = useGridRangeStore((s) => s.axes);

    const firstModelValidSubstances =
        selectedModels.length > 0 ? new Set(selectedModels[0].validSubstances) : new Set<string>();

    const allValidSubstances = new Set(selectedModels.flatMap((m) => m.validSubstances));
    const invisible = Array.from(allValidSubstances).filter((name) => concentrations[name] === undefined);

    const isSubstanceValid = (substance: string) =>
        selectedModels.length > 0 && firstModelValidSubstances.has(substance);

    const gatherInputs = () => {
        const validConcentrations = Object.fromEntries(
            Object.entries(concentrations).filter(
                ([substance]) => selectedModels.length === 0 || isSubstanceValid(substance)
            )
        );

        const models = sortModelsByCategory(selectedModels).map((model) => {
            const store = getModelInputStore(model);
            return {
                modelId: model.modelId,
                parameters: store.getState().parameters,
            };
        });

        return { concentrations: validConcentrations, conditions, models };
    };

    const handleSubmit = () => {
        onSubmit(gatherInputs());
    };

    const handleRunGrid = () => {
        const { axes } = useGridRangeStore.getState();
        if (axes.length === 0) return;
        const { concentrations: validConcentrations, conditions: gridConditions, models } = gatherInputs();
        onRunGrid({
            axes,
            concentrations: validConcentrations,
            conditions: gridConditions,
            models,
        });
    };

    const hasInvalidSubstances = Object.keys(concentrations).some(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );
    const hasNoValidSubstances = Object.keys(concentrations).every(
        (substance) => selectedModels.length > 0 && !firstModelValidSubstances.has(substance)
    );

    const gridableSubstances = Object.keys(concentrations).filter(isSubstanceValid);
    const canRunGrid =
        gridAxes.length > 0 &&
        gridAxes.every((a) => a.substance !== "" && a.range.max > a.range.min && a.range.step > 0) &&
        !hasNoValidSubstances;

    return (
        <div>
            <Columns>
                <div>
                    <Typography variant="h3">Concentrations</Typography>
                    {Object.entries(concentrations).map(([name, value]) => {
                        const invalid = selectedModels.length > 0 && !firstModelValidSubstances.has(name);
                        const isGridded = gridAxes.some((a) => a.substance === name);

                        return (
                            <TextField
                                type="number"
                                key={name}
                                label={optionName(name)}
                                style={{
                                    paddingTop: "5px",
                                    opacity: invalid || isGridded ? 0.6 : 1,
                                }}
                                step="any"
                                unit="ppm"
                                max={PPM_MAX}
                                value={value}
                                disabled={isGridded}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setConcentration(name, Math.min(e.target.valueAsNumber, PPM_MAX))
                                }
                                helperText={
                                    invalid
                                        ? "⚠️ Not supported by selected models"
                                        : isGridded
                                          ? "Varied across the configured range"
                                          : undefined
                                }
                                variant={invalid ? "error" : undefined}
                            />
                        );
                    })}
                    <SubstanceAdder invisible={invisible} onAdd={(item: string) => setConcentration(item, 0)} />
                    <div style={{ marginTop: "1rem" }}>
                        <GridRangeInput candidateSubstances={gridableSubstances} />
                    </div>
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
            <div style={{ marginTop: "1em", display: "flex", gap: "1em" }}>
                <Button
                    onClick={gridAxes.length > 0 ? handleRunGrid : handleSubmit}
                    disabled={gridAxes.length > 0 ? !canRunGrid : hasNoValidSubstances || selectedModels.length === 0}
                >
                    Run Simulation(s)
                </Button>
            </div>
        </div>
    );
};

export default ModelInputs;
