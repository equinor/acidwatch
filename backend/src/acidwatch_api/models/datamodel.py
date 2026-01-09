from __future__ import annotations

from datetime import datetime
from typing import Any, List, Literal, Optional, Dict, TypeAlias, Iterable
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _BaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class RunRequest(_BaseModel):
    concentrations: dict[str, int | float]
    parameters: dict[str, bool | float | int | str]


class ModelInput(RunRequest):
    model_id: str


class RunResponse(_BaseModel):
    status: Literal["done", "pending", "failed"]
    model_input: ModelInput
    final_concentrations: dict[str, int | float] = Field(default_factory=dict)
    panels: Iterable[AnyPanel] = ()
    error: str | None = None


class ChainRequest(_BaseModel):
    stages: list[ModelInput]


class ChainedRunResponse(_BaseModel):
    status: Literal["done", "pending"]
    stages: list[RunResponse]


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


class SimulationRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
    initial_concentrations: dict[str, float] = Field(default_factory=dict)
    parameters: dict[str, float] = Field(default_factory=dict)


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
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
    id: UUID = Field(default_factory=lambda: uuid4())
    project_id: str = ""
    name: str = ""
    owner: str = ""
    scenario_inputs: SimulationRequest
    model: str = "arcs"
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# TODO: define the Result model, this is what we store in db
class Result(BaseModel):
    id: UUID = Field(default_factory=lambda: uuid4())
    scenario_id: str = ""
    raw_results: str = ""
    initial_concentrations: Optional[dict[str, float]] = Field(default_factory=dict)
    final_concentrations: Optional[dict[str, float]] = Field(default_factory=dict)
    panels: Optional[List[AnyPanel]] = Field(default_factory=list)
