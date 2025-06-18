from __future__ import annotations
from typing import Any


COMMON_INPUT_PROPERTIES = {
    "meta": "ppm",
    "max": 1000000,
    "type": "float",
    "input_type": "textbox",
}

CO2SPEC_DEFAULTS = {
    "O2": 30,
    "H2O": 30,
    "H2S": 0,
    "SO2": 10,
    "NO2": 20,
}

ARCS_DEFAULTS = {
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

CO2SPEC_INPUT_CONCENTRATIONS = {
    compound: {
        **COMMON_INPUT_PROPERTIES,
        "defaultvalue": default_value,
        "enabled": True,
    }
    for compound, default_value in CO2SPEC_DEFAULTS.items()
}

ARCS_INPUT_CONCENTRATIONS = {
    compound: {
        **COMMON_INPUT_PROPERTIES,
        "defaultvalue": default_value,
        "enabled": compound in ["O2", "H2O", "H2S", "SO2", "NO2"],
    }
    for compound, default_value in ARCS_DEFAULTS.items()
}

CO2SPEC_CONFIG = {
    "co2spec": {
        "formconfig": {
            "settings": {},
            "inputConcentrations": CO2SPEC_INPUT_CONCENTRATIONS,
        }
    }
}

ARCS_CONFIG = {
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
                    "max": 1000,
                    "min": 1,
                },
            },
            "inputConcentrations": ARCS_INPUT_CONCENTRATIONS,
        }
    }
}


def get_model_config(user: bool) -> dict[str, Any]:
    if not user:
        return {
            "co2spec": {"formconfig": {"unavailable": "You need to be authenticated"}},
            **ARCS_CONFIG,
        }
    else:
        return {**CO2SPEC_CONFIG, **ARCS_CONFIG}
