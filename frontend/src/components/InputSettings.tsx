import { Autocomplete, TextField } from "@equinor/eds-core-react";
import { FormConfig } from "../dto/FormConfig";

interface InputSettingsProps {
    formConfig: FormConfig;
    setFormConfig: React.Dispatch<React.SetStateAction<FormConfig>>;
}

const InputSettings: React.FC<InputSettingsProps> = ({ formConfig, setFormConfig }) => {
        return <div>{Object.keys(formConfig.settings).map((key) => {
            const setting = formConfig.settings[key];
            return setting.input_type === "autocomplete" ? (
                <Autocomplete
                    key={key}
                    id={key}
                    label={key}
                    style={{paddingTop:"5px"}}
                    meta={setting.meta}
                    placeholder={`Select ${key}`}
                    options={setting.values || []}
                    initialSelectedOptions={[setting.defaultvalue]}
                    hideClearButton={true}
                    onOptionsChange={({ selectedItems }) =>
                        setFormConfig((prevConfig: FormConfig) => ({
                            ...prevConfig,
                            settings: {
                                ...prevConfig.settings,
                                [key]: {
                                    ...prevConfig.settings[key],
                                    defaultvalue:
                                        selectedItems[0] || prevConfig.settings[key].defaultvalue,
                                },
                            },
                        }))
                    }
                />
            ) : (
                <TextField
                    type="number"
                    key={key}
                    label={key}
                    id={key}
                    style={{paddingTop:"5px"}}
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
}
export default InputSettings;