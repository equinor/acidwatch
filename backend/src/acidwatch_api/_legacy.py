from __future__ import annotations
from typing import Any

from acidwatch_api.models.base import RunResult, get_concs
from acidwatch_api.models.datamodel import (
    ModelInfo,
    SimulationResults,
)


DEFAULTS = {
    "O2": 30,
    "H2O": 30,
    "H2S": 0,
    "SO2": 10,
    "NO2": 20,
}


def model_infos_to_formconfig(models: list[ModelInfo]) -> dict[str, Any]:
    return {
        model.model_id: {
            "formconfig": {
                "inputConcentrations": {
                    subst: {
                        "defaultvalue": DEFAULTS.get(subst, 0),
                        "enabled": subst in DEFAULTS,
                        "meta": "ppm",
                        "max": 1_000_000,
                        "type": "float",
                        "input_type": "textbox",
                    }
                    for subst in model.valid_substances
                },
                "settings": {
                    name: {
                        "defaultvalue": param["default"],
                        "meta": str(param.get("unit", param.get("custom_unit", ""))),
                        "type": "float",
                        "input_type": "slider",
                        "enabled": True,
                        "min": param.get("minimum"),
                        "max": param.get("maximum"),
                    }
                    for name, param in model.parameters.items()
                },
                "unavailable": model.access_error,
            },
        }
        for model in models
    }


def result_to_simulation_results(
    initial: dict[str, int | float], result: RunResult
) -> SimulationResults:
    final = get_concs(result)

    change = {name: value - initial.get(name, 0) for name, value in final.items()}
    change = to_ppm(change)
    final = to_ppm(final)
    initial = to_ppm(initial)

    for name in list(change):
        if initial.get(name) == 0 and final.get(name) == 0:
            del initial[name]
            del final[name]
            del change[name]

    # Extract table from JsonResult if present
    table = None
    if isinstance(result, tuple) and len(result) > 1:
        for r in result[1:]:
            if hasattr(r, "json") and isinstance(r.json, dict) and "table" in r.json:
                table = r.json["table"]
                break
                
    sim_results = {
        "results": {
            "initfinaldiff": {
                "initial": initial,
                "final": final,
                "change": change,
            }
        },
        "analysis": None,
        "chart_data": {
            "comps": {str(i): k.upper() for i, k in enumerate(change.keys())},
            "values": {str(i): v for i, v in enumerate(change.values())},
            "variance": {},
            "variance_minus": {},
        },
    }
    if table is not None:
        sim_results["table_data"] = table
        return sim_results
    return SimulationResults.model_validate(sim_results)


def to_ppm(inp: dict[str, int | float]) -> dict[str, float]:
    return {name: float(value * 1e6) for name, value in inp.items()}
