import { Slider, TextField } from "@equinor/eds-core-react";
import { FormConfig } from "../dto/FormConfig";

interface InputSettingsProps {
    formConfig: FormConfig;
    setFormConfig: React.Dispatch<React.SetStateAction<FormConfig>>;
}

const InputSettings: React.FC<InputSettingsProps> = ({ formConfig, setFormConfig }) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {Object.keys(formConfig.settings).map((key) => {
                const setting = formConfig.settings[key];
                return setting.input_type === "slider" ? (
                    <div key={key} style={{ paddingTop: "10px" }}>
                        <label htmlFor={key}>
                            {key}: {setting.defaultvalue} {setting.meta}{" "}
                        </label>
                        <Slider
                            aria-type="number"
                            min={setting.min}
                            max={setting.max}
                            aria-label={key}
                            id={key}
                            step={1}
                            value={setting.defaultvalue}
                            onChange={(e: { target: { value: string } }) =>
                                setFormConfig((prevConfig: FormConfig) => ({
                                    ...prevConfig,
                                    settings: {
                                        ...prevConfig.settings,
                                        [key]: {
                                            ...prevConfig.settings[key],
                                            defaultvalue: parseFloat(e.target.value),
                                        },
                                    },
                                }))
                            }
                        />
                    </div>
                ) : (
                    <TextField
                        type="number"
                        key={key}
                        min={setting.min}
                        label={key}
                        id={key}
                        style={{ paddingTop: "5px" }}
                        step="any"
                        name={key}
                        meta={setting.meta}
                        value={setting.defaultvalue}
                        onChange={(e: { target: { value: string } }) =>
                            setFormConfig((prevConfig: FormConfig) => ({
                                ...prevConfig,
                                settings: {
                                    ...prevConfig.settings,
                                    [key]: {
                                        ...prevConfig.settings[key],
                                        defaultvalue: parseFloat(e.target.value),
                                    },
                                },
                            }))
                        }
                    />
                );
            })}
        </div>
    );
};

export default InputSettings;
