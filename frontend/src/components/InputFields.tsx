import { Autocomplete, TextField } from "@equinor/eds-core-react";
import { FormConfig } from "../dto/FormConfig";

export const renderTextField = (
    key: string,
    value: number,
    setFormConfig: React.Dispatch<React.SetStateAction<FormConfig>>,
    meta?: string
) => (
    <TextField
        type="number"
        key={key}
        label={key}
        id={key}
        step="any"
        name={key}
        meta={meta}
        value={value}
        onChange={(e: { target: { value: string } }) =>
            setFormConfig((prevConfig: FormConfig) => ({
                ...prevConfig,
                inputConcentrations: {
                    ...prevConfig.inputConcentrations,
                    [key]: {
                        ...prevConfig.inputConcentrations[key],
                        defaultvalue: parseFloat(e.target.value),
                    },
                },
            }))
        }
    />
);

export const renderAutocomplete = (
    key: string,
    values: number[],
    setFormConfig: React.Dispatch<React.SetStateAction<FormConfig>>,
    meta?: string
) => (
    <Autocomplete
        key={key}
        id={key}
        label={key}
        meta={meta}
        placeholder={`Select ${key}`}
        options={values}
        onOptionsChange={({ selectedItems }) =>
            setFormConfig((prevConfig: FormConfig) => ({
                ...prevConfig,
                settings: {
                    ...prevConfig.settings,
                    [key]: {
                        ...prevConfig.settings[key],
                        defaultvalue: selectedItems[0] || prevConfig.settings[key].defaultvalue,
                    },
                },
            }))
        }
    />
);
