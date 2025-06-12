import { TextField } from "@equinor/eds-core-react";
import { FormConfig, InputConfig } from "../dto/FormConfig";
import Temperature from "./Temperature";
import { ChangeEventHandler } from "react";

interface InputSettingsProps {
    formConfig: FormConfig;
    setFormConfig: React.Dispatch<React.SetStateAction<FormConfig>>;
}

interface FieldProps {
    name: string;
    setting: InputConfig;
    setValue: (value: number) => void;
}

const TemperatureField: React.FC<FieldProps> = ({ name, setting, setValue }) => {
    return (
        <Temperature.TextField
            min={setting.min}
            max={setting.max}
            aria-label={name}
            id={name}
            step={1}
            label={name}
            value={setting.defaultvalue}
            onValueChange={(value: number) => setValue(value)}
        />
    );
};

const AnyField: React.FC<FieldProps> = ({ name, setting, setValue }) => {
    const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        setValue(e.target.valueAsNumber);
    };

    return (
        <TextField
            type="number"
            min={setting.min}
            max={setting.max}
            aria-label={name}
            id={name}
            step={1}
            label={name}
            meta={setting.meta}
            value={setting.defaultvalue}
            onChange={onChange}
        />
    );
};

const InputSettings: React.FC<InputSettingsProps> = ({ formConfig, setFormConfig }) => {
    const fields = Object.entries(formConfig.settings).map(([name, setting], index) => {
        const Cls = setting.unit === "kelvin" ? TemperatureField : AnyField;
        const setValue = (value: number) => {
            setFormConfig({
                ...formConfig,
                settings: {
                    ...formConfig.settings,
                    [name]: {
                        ...formConfig.settings[name],
                        defaultvalue: value,
                    },
                },
            });
        };

        return (
            <div key={index} style={{ paddingTop: "10px" }}>
                <Cls name={name} setting={setting} setValue={setValue} />
            </div>
        );
    });

    return <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{fields}</div>;
};

export default InputSettings;
