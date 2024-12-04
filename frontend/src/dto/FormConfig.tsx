export interface InputConfig {
    defaultvalue: number;
    type: string;
    input_type: string;
    values?: number[];
    range?: number[];
    enabled: boolean;
}

export interface FormConfig {
    settings: Record<string, InputConfig>;
    inputConcentrations: Record<string, InputConfig>;
}

// TODO: this should come from api
export const formConfig: FormConfig = {
    settings: {
        Temperature: {
            defaultvalue: 300,
            type: "float",
            input_type: "autocomplete",
            values: [300, 400, 500, 600, 700, 800, 900, 1000],
            enabled: true,
        },
        Pressure: {
            defaultvalue: 10,
            type: "float",
            input_type: "autocomplete",
            values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            enabled: true,
        },
        SampleLength: {
            defaultvalue: 10,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
    },
    inputConcentrations: {
        CH2O2: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CH3CH2OH: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CO: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        H2: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        O2: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CH3COOH: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CH3OH: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CH4: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CH3CHO: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        H2CO: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        CO2: {
            defaultvalue: 1,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
        H2O: {
            defaultvalue: 2e-5,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
        H2SO4: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        H2S: {
            defaultvalue: 3e-5,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
        S8: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        SO2: {
            defaultvalue: 1e-5,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
        H2SO3: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        HNO3: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        NO2: {
            defaultvalue: 5e-5,
            type: "float",
            input_type: "textbox",
            enabled: true,
        },
        NH3: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        HNO2: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        NO: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        N2: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
        NOHSO4: {
            defaultvalue: 0,
            type: "float",
            input_type: "textbox",
            enabled: false,
        },
    },
};
