import React, { ChangeEvent, useState } from "react";
import { ModelConfig } from "@/dto/FormConfig";
import { Autocomplete, Button, NativeSelect, TextField, Typography } from "@equinor/eds-core-react";
import ConvertibleTextField from "./ConvertibleTextField.tsx";
import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map.tsx";
import { MetaTooltip } from "@/functions/Tooltip.tsx";

const DEFAULTS = {
    O2: 30,
    H2O: 30,
    H2S: 0,
    SO2: 10,
    NO2: 20,
};

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
    if (!model.parameters) return;

    return (
        <div style={{ display: "flex", flexFlow: "column", gap: "1.5rem", paddingTop: "1em" }}>
            <Typography bold> Input parameters </Typography>
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

function getParameterDefaults(model: ModelConfig) {
    return Object.fromEntries(Object.entries(model.parameters).map(([key, value]) => [key, value.default]));
}

const ModelInputs: React.FC<{
    model: ModelConfig;
    visible: boolean;
    onSubmit: (concentrations: Record<string, number>, parameters: Record<string, number>) => void;
}> = ({ model, visible: not_hidden, onSubmit }) => {
    const filteredDefaults = Object.fromEntries(
        Object.entries(DEFAULTS).filter(([key]) => model.validSubstances.includes(key))
    );

    const [concentrations, setConcentrations] = useState<Record<string, number>>(filteredDefaults);
    const [visible, setVisible] = useState<string[]>(Object.keys(filteredDefaults));
    const [parameters, setParameters] = useState<Record<string, any>>(getParameterDefaults(model));

    if (!not_hidden) {
        return <></>;
    }

    const invisible = model.validSubstances.filter((subst) => !visible.includes(subst));

    return (
        <>
            <Typography bold>Input concentrations</Typography>
            {visible.map((subst, index) => (
                <TextField
                    type="number"
                    key={index}
                    id={subst}
                    label={optionName(subst)}
                    style={{ paddingTop: "5px" }}
                    step="any"
                    unit="ppm"
                    max={PPM_MAX}
                    value={concentrations[subst] ?? 0}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setConcentrations({ ...concentrations, [subst]: Math.min(e.target.valueAsNumber, PPM_MAX) })
                    }
                />
            ))}
            <SubstanceAdder invisible={invisible} onAdd={(item: string) => setVisible([...visible, item])} />
            <ParametersInput
                model={model}
                parameters={parameters}
                setParameter={(name: string, value: any) => {
                    setParameters({ ...parameters, [name]: value });
                }}
            />
            <Button style={{ marginTop: "1em" }} onClick={() => onSubmit(concentrations, parameters)}>
                Run Simulation
            </Button>
        </>
    );
};

export default ModelInputs;
