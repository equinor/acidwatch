import React, { ChangeEventHandler, InputHTMLAttributes } from "react";
import { TextField as BaseComponent, TextFieldProps as BaseComponentProps } from "@equinor/eds-core-react";
import { useStore } from "./store";
import { useShallow } from "zustand/shallow";

type TextFieldProps = Omit<
    BaseComponentProps & InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "type" | "value"
> & {
    onValueChange: (value: number) => void;
    value: number;
    min?: number;
    max?: number;
};

const TextField: React.FC<TextFieldProps> = ({ value, onValueChange, min, max, ...props }) => {
    const [prettyUnit, convertTo, convertFrom] = useStore(
        useShallow((store) => [store.prettyUnit, store.convertTo, store.convertFrom])
    );

    const onChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        onValueChange(convertFrom(event.target.valueAsNumber));
    };

    return (
        <BaseComponent
            type="number"
            min={min !== undefined ? convertTo(min) : undefined}
            max={max !== undefined ? convertTo(max) : undefined}
            value={convertTo(value)}
            onChange={onChange}
            unit={prettyUnit}
            {...props}
        />
    );
};

export default TextField;
