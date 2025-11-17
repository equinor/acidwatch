import { TextField } from "@equinor/eds-core-react";
import { ChangeEventHandler, FocusEventHandler, ForwardedRef, ReactNode, useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";

// Copied and modified from EDS
type ConvertibleTextFieldProps = {
    /** Input unique id. If this is not provided, one will be generated */
    id?: string;
    /** Label text */
    label?: ReactNode;
    /** Meta text */
    meta?: ReactNode;
    /** Helper text */
    helperText?: string;
    /** InputIcon */
    inputIcon?: ReactNode;
    /** HelperIcon */
    helperIcon?: ReactNode;
    /** Input ref */
    inputRef?: ForwardedRef<HTMLInputElement>;
    /** ConvertibleUnit */
    convertibleUnit?: string;
    /** Unit */
    unit?: string;
    /** Value */
    value?: number;
    /** onValueChange */
    onValueChange?: (newValue: number) => void;
    /** Lower bound */
    min?: number;
    /** Upper bound */
    max?: number;
};

function ConvertibleTextField({
    convertibleUnit,
    unit: customUnit,
    value,
    onValueChange,
    min,
    max,
    meta,
    ...props
}: ConvertibleTextFieldProps) {
    const { getUnit } = useSettings();
    const unit = getUnit(convertibleUnit, customUnit);
    value ??= 0;

    const [valueStr, setValueStr] = useState(unit.valueToNumber(value).toString());
    const [valid, setValid] = useState(true);

    min ??= -Infinity;
    max ??= Infinity;

    const helperText = `(Number between ${unit.valueToString(min)} and ${unit.valueToString(max)})`;

    useEffect(() => {
        setValueStr(unit.valueToNumber(value).toString());
    }, [value, unit]);

    const constrain = (value: number): number | null =>
        Number.isNaN(value) ? null : Math.max(Math.min(value, max), min);

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const value = unit.valueFromNumber(e.target.valueAsNumber);
        const constrainedValue = constrain(value);

        setValid(value === constrainedValue);
        setValueStr(e.target.value);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        const newValue = constrain(unit.valueFromNumber(e.target.valueAsNumber));
        if (newValue === null) {
            setValueStr(unit.valueToNumber(value).toString());
        } else {
            setValueStr(unit.valueToNumber(newValue).toString());
            if (onValueChange) onValueChange(newValue);
        }

        setValid(true);
    };

    return (
        <TextField
            type="number"
            unit={unit?.unit ?? customUnit ?? ""}
            helperText={helperText}
            value={valueStr}
            min={unit.valueToNumber(min)}
            max={unit.valueToNumber(max)}
            meta={meta}
            onBlur={handleBlur}
            onChange={handleChange}
            variant={valid ? undefined : "error"}
            {...props}
        />
    );
}

export default ConvertibleTextField;
