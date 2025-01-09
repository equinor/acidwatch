

def get_model_config():
    return {
        "co2spec": {
            "formconfig": {
                "settings": {},
                "inputConcentrations": {
                    "H2O": {
                        "defaultvalue": 30,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True
                    },
                    "O2": {
                        "defaultvalue": 30,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True
                    },
                    "SO2": {
                        "defaultvalue": 10,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True
                    },
                    "NO2": {
                        "defaultvalue": 20,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True
                    },
                    "H2S": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True
                    }
                }
            }
        },
        "arcs": {
            "formconfig": {
                "settings": {
                    "Temperature": {
                        "defaultvalue": 300,
                        "meta": "K",
                        "type": "float",
                        "input_type": "autocomplete",
                        "values": [200, 250, 300, 350, 400],
                        "enabled": True,
                    },
                    "Pressure": {
                        "defaultvalue": 10,
                        "meta": "bar",
                        "type": "float",
                        "input_type": "autocomplete",
                        "values": [1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 125, 150, 175, 200, 225, 250, 275, 300],
                        "enabled": True,
                    },
                    "SampleLength": {
                        "defaultvalue": 10,
                        "meta": "",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                    },
                },
                "inputConcentrations": {
                    "CH2O2": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CH3CH2OH": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CO": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "H2": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "O2": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CH3COOH": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CH3OH": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CH4": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "CH3CHO": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "H2CO": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "H2O": {
                        "defaultvalue": 20,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                    },
                    "H2SO4": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "H2S": {
                        "defaultvalue": 30,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                    },
                    "S8": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "SO2": {
                        "defaultvalue": 10,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                    },
                    "H2SO3": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "HNO3": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "NO2": {
                        "defaultvalue": 50,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": True,
                    },
                    "NH3": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "HNO2": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "NO": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "N2": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                    "NOHSO4": {
                        "defaultvalue": 0,
                        "meta": "ppm",
                        "type": "float",
                        "input_type": "textbox",
                        "enabled": False,
                    },
                }
            }
        }
    }
