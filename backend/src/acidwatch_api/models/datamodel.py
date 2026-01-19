from __future__ import annotations

from typing import Any, Literal, Optional, Dict, TypeAlias

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _BaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ModelInput(BaseModel):
    model_id: str
    parameters: dict[str, bool | float | int | str]


class Simulation(BaseModel):
    concentrations: dict[str, int | float]
    models: list[ModelInput]


class ModelResult(BaseModel):
    concentrations: dict[str, int | float]
    panels: list[AnyPanel]


class SimulationResult(_BaseModel):
    status: Literal["done", "pending"]
    input: Simulation
    results: list[ModelResult | None]


class JsonResult(BaseModel):
    type: Literal["json"] = "json"
    label: str | None = None
    data: Any


class ReactionPathsResult(BaseModel):
    type: Literal["reaction_paths"] = "reaction_paths"
    label: str | None = None
    common_paths: Any
    stats: Any


class TextResult(BaseModel):
    type: Literal["text"] = "text"
    label: str | None = None
    data: str


class TableResult(BaseModel):
    type: Literal["table"] = "table"
    label: str | None = None
    data: Any


AnyPanel: TypeAlias = JsonResult | TextResult | ReactionPathsResult | TableResult


class ModelInfo(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    access_error: str | None
    model_id: str
    display_name: str
    description: str
    category: str
    valid_substances: list[str]
    parameters: dict[str, Any]


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
