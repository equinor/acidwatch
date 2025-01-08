export interface InputConfig {
    defaultvalue: number;
    meta?: string;
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
export const getFormConfig = (model: string): FormConfig => {
    if (model === "co2spec") {
        return {
            settings: {},
            inputConcentrations: {
                H20: {
                    defaultvalue: 30,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                O2: {
                    defaultvalue: 30,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                SO2: {
                    defaultvalue: 10,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                NO2: {
                    defaultvalue: 20,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                H2S: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
            },
        };
    } else {
        return {
            settings: {
                Temperature: {
                    defaultvalue: 300,
                    meta: "K",
                    type: "float",
                    input_type: "autocomplete",
                    values: [200, 250, 300, 350, 400],
                    enabled: true,
                },
                Pressure: {
                    defaultvalue: 10,
                    meta: "bar",
                    type: "float",
                    input_type: "autocomplete",
                    values: [1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 125, 150, 175, 200, 225, 250, 275, 300],
                    enabled: true,
                },
                SampleLength: {
                    defaultvalue: 10,
                    meta: "",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
            },
            inputConcentrations: {
                CH2O2: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CH3CH2OH: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CO: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                H2: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                O2: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CH3COOH: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CH3OH: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CH4: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                CH3CHO: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                H2CO: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                H2O: {
                    defaultvalue: 20,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                H2SO4: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                H2S: {
                    defaultvalue: 30,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                S8: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                SO2: {
                    defaultvalue: 10,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                H2SO3: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                HNO3: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                NO2: {
                    defaultvalue: 50,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: true,
                },
                NH3: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                HNO2: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                NO: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                N2: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
                NOHSO4: {
                    defaultvalue: 0,
                    meta: "ppm",
                    type: "float",
                    input_type: "textbox",
                    enabled: false,
                },
            },
        };
    }
};
