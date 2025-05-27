def get_model_config():
    # Common input concentration properties
    common_input_properties = {
        "meta": "ppm",
        "max": 1000000,
        "type": "float",
        "input_type": "textbox",
    }

    # Default values for co2spec
    co2spec_defaults = {
        "O2": 30,
        "H2O": 30,
        "H2S": 0,
        "SO2": 10,
        "NO2": 20,
    }

    # Default values for arcs
    arcs_defaults = {
        "CH2O2": 0,
        "CH3CH2OH": 0,
        "CO": 0,
        "H2": 0,
        "O2": 50,
        "CH3COOH": 0,
        "CH3OH": 0,
        "CH4": 0,
        "CH3CHO": 0,
        "H2CO": 0,
        "H2O": 20,
        "H2SO4": 0,
        "H2S": 30,
        "S8": 0,
        "SO2": 10,
        "H2SO3": 0,
        "HNO3": 0,
        "NO2": 50,
        "NH3": 0,
        "HNO2": 0,
        "NO": 0,
        "N2": 0,
        "NOHSO4": 0,
    }

    # Create input concentrations using dictionary comprehension
    co2spec_input_concentrations = {
        compound: {
            **common_input_properties,
            "defaultvalue": default_value,
            "enabled": True,
        }
        for compound, default_value in co2spec_defaults.items()
    }

    arcs_input_concentrations = {
        compound: {
            **common_input_properties,
            "defaultvalue": default_value,
            "enabled": compound in ["O2", "H2O", "H2S", "SO2", "NO2"],
        }
        for compound, default_value in arcs_defaults.items()
    }

    return {
        "co2spec": {
            "formconfig": {
                "settings": {},
                "inputConcentrations": co2spec_input_concentrations,
            }
        },
        "arcs": {
            "formconfig": {
                "settings": {
                    "Temperature": {
                        "defaultvalue": 300,
                        "meta": "K",
                        "type": "float",
                        "input_type": "slider",
                        "enabled": True,
                        "max": 400,
                        "min": 200,
                    },
                    "Pressure": {
                        "defaultvalue": 10,
                        "meta": "bar",
                        "type": "float",
                        "input_type": "slider",
                        "enabled": True,
                        "max": 300,
                        "min": 1,
                    },
                    "SampleLength": {
                        "defaultvalue": 10,
                        "meta": "",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                        "min": 1,
                    },
                },
                "inputConcentrations": arcs_input_concentrations,
            }
        },
    }
