import React, { ChangeEvent, ChangeEventHandler, FocusEventHandler, useEffect, useState } from "react";
import { ModelConfig, ParameterConfig } from "../dto/FormConfig";
import { Autocomplete, Button, TextField, Typography } from "@equinor/eds-core-react";
import { useSettings } from "../contexts/SettingsContext";

const DEFAULTS = {
    O2: 30,
    H2O: 30,
    H2S: 0,
    SO2: 10,
    NO2: 20,
};

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

function ParameterTextField({
    config,
    value,
    onChange,
}: {
    config: ParameterConfig;
    value: number;
    onChange?: (newValue: number) => void;
}) {
    const { getUnit } = useSettings();
    const unit = getUnit(config.convertibleUnit, config.unit);

    const [valueStr, setValueStr] = useState(unit.valueToNumber(value).toString());
    const [valid, setValid] = useState(true);

    const min = config.minimum ?? -Infinity;
    const max = config.maximum ?? Infinity;

    const helperText = `(Number between ${unit.valueToString(min)} and ${unit.valueToString(max)})`;

    useEffect(() => {
        setValueStr(unit.valueToNumber(value).toString());
    }, [value, unit]);

    const constrain = (value: number): number | null => {
        const newValue = unit.valueFromNumber(value);
        if (Number.isNaN(newValue)) {
            return null;
        } else {
            return Math.max(Math.min(value, max), min);
        }
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const value = unit.valueFromNumber(e.target.valueAsNumber);
        const constrainedValue = constrain(value);

        setValid(value === constrainedValue);
        setValueStr(e.target.value);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        if (!onChange) return;

        const newValue = constrain(unit.valueFromNumber(e.target.valueAsNumber));
        if (newValue === null) {
            setValueStr(unit.valueToNumber(value).toString());
        } else {
            setValueStr(unit.valueToNumber(newValue).toString());
            onChange(newValue);
        }

        setValid(true);
    };

    return (
        <TextField
            type="number"
            label={config.label}
            step={1}
            unit={unit?.unit ?? config.unit}
            helperText={helperText}
            value={valueStr}
            min={unit.valueToNumber(min)}
            max={unit.valueToNumber(max)}
            onBlur={handleBlur}
            onChange={handleChange}
            variant={valid ? undefined : "error"}
        />
    );
}

function ParametersInput({
    model,
    parameters,
    setParameter,
}: {
    model: ModelConfig;
    parameters: Record<string, number>;
    setParameter: (name: string, value: number) => void;
}) {
    if (!model.parameters) return;

    return (
        <div style={{ display: "flex", flexFlow: "column", gap: "1.5rem", paddingTop: "1em" }}>
            <Typography bold> Input parameters </Typography>
            {Object.entries(model.parameters).map(([name, config]) => (
                <ParameterTextField
                    key={name}
                    config={config}
                    value={parameters[name]}
                    onChange={(value: number) => setParameter(name, value)}
                />
            ))}
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
    const [parameters, setParameters] = useState<Record<string, number>>(getParameterDefaults(model));

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
                    label={subst}
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
                setParameter={(name: string, value: number) => {
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
