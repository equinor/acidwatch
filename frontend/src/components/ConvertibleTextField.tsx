import { TextField } from "@equinor/eds-core-react";
import { ChangeEventHandler, FocusEventHandler, ForwardedRef, ReactNode, useEffect, useState } from "react";

type ConvertibleTextFieldProps = {
    id?: string;
    label?: ReactNode;
    meta?: ReactNode;
    helperText?: string;
    inputRef?: ForwardedRef<HTMLInputElement>;
    unit?: string;
    value?: number;
    onValueChange?: (newValue: number) => void;
    min?: number;
    max?: number;
};

function ConvertibleTextField({ unit, value, onValueChange, min, max, meta, ...props }: ConvertibleTextFieldProps) {
    value ??= 0;

    const [valueStr, setValueStr] = useState(value.toString());
    const [valid, setValid] = useState(true);

    min ??= -Infinity;
    max ??= Infinity;

    const helperText =
        Number.isFinite(min) && Number.isFinite(max)
            ? `(Number between ${min}${unit ? " " + unit : ""} and ${max}${unit ? " " + unit : ""})`
            : undefined;

    useEffect(() => {
        setValueStr(value.toString());
    }, [value]);

    const constrain = (v: number): number | null => (Number.isNaN(v) ? null : Math.max(Math.min(v, max), min));

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const v = e.target.valueAsNumber;
        const constrainedValue = constrain(v);

        setValid(v === constrainedValue);
        setValueStr(e.target.value);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        const newValue = constrain(e.target.valueAsNumber);
        if (newValue === null) {
            setValueStr(value.toString());
        } else {
            setValueStr(newValue.toString());
            if (onValueChange) onValueChange(newValue);
        }

        setValid(true);
    };

    return (
        <TextField
            type="number"
            unit={unit ?? ""}
            helperText={helperText}
            value={valueStr}
            min={min}
            max={max}
            meta={meta}
            onBlur={handleBlur}
            onChange={handleChange}
            variant={valid ? undefined : "error"}
            {...props}
        />
    );
}

export default ConvertibleTextField;
