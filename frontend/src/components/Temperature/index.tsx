import React from "react";
import Switch from "./Switch";
import TextField from "./TextField";
import { useStore } from "./store";
import { useShallow } from "zustand/shallow";

interface TemperatureProps {
    value: number;
}

interface TemperatureCompound {
    Switch: typeof Switch;
    TextField: typeof TextField;
}

const Temperature: React.FC<TemperatureProps> & TemperatureCompound = ({ value }) => {
    const [prettyUnit, converted] = useStore(useShallow((state) => [state.prettyUnit, state.convertTo(value)]));
    return (
        <span>
            {converted} {prettyUnit}
        </span>
    );
};

Temperature.Switch = Switch;
Temperature.TextField = TextField;

export default Temperature;
