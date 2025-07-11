from __future__ import annotations

from datetime import datetime
from typing import Any, List, Literal, Optional, Dict, TypeAlias
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class JsonResult(BaseModel):
    type: Literal["json"] = "json"
    json: Any


class TextResult(BaseModel):
    type: Literal["text"] = "text"
    text: str


AnyResult: TypeAlias = JsonResult | TextResult


class ModelInfo(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    access_error: str | None
    model_id: str
    display_name: str
    valid_substances: list[str]
    parameters: dict[str, Any]


class InitFinalDiff(BaseModel):
    initial: Dict[str, float]
    final: Dict[str, float]
    change: Dict[str, float]


class Results(BaseModel):
    initfinaldiff: InitFinalDiff


class CommonPaths(BaseModel):
    paths: Optional[Dict[str, Optional[str]]] = Field(default_factory=dict)
    k: Optional[Dict[str, Optional[str]]] = Field(default_factory=dict)
    frequency: Optional[Dict[str, Optional[int]]] = Field(default_factory=dict)


class Stats(BaseModel):
    index: Dict[str, str] = Field(default_factory=dict)
    k: Dict[str, str] = Field(default_factory=dict)
    frequency: Dict[str, float] = Field(default_factory=dict)


class Analysis(BaseModel):
    common_paths: CommonPaths
    stats: Stats


class ChartData(BaseModel):
    comps: Dict[str, str]
    values: Dict[str, float]
    variance: Dict[str, float]
    variance_minus: Dict[str, float]


class SimulationResults(BaseModel):
    results: Results
    analysis: Optional[Analysis] = None
    chart_data: ChartData


class SimulationRequest(BaseModel):
    concs: dict[str, float] = Field(default_factory=dict)
    settings: dict[str, float] = Field(default_factory=dict)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "concs": {
                        "SO2": 10e-6,
                        "NO2": 50e-6,
                        "H2S": 30e-6,
                        "H2O": 20e-6,
                    },
                    "settings": {
                        "Temperature": 300,
                        "Pressure": 10,
                        "SampleLength": 10,
                    },
                }
            ]
        }
    }


class Project(BaseModel):
    id: UUID = uuid4()
    name: str = ""
    description: str = ""
    owner: str = ""
    owner_id: str = ""
    private: bool = True
    access_ids: List[str] = []
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Scenario(BaseModel):
    id: UUID = uuid4()
    project_id: str = ""
    name: str = ""
    owner: str = ""
    scenario_inputs: SimulationRequest = SimulationRequest()
    model: str = "arcs"
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# TODO: define the Result model, this is what we store in db
class Result(BaseModel):
    id: UUID = uuid4()
    scenario_id: str = ""
    raw_results: str = ""
    output_concs: Optional[dict[str, float]] = Field(default_factory=dict)
    stats: Optional[dict[str, float]] = Field(default_factory=dict)
