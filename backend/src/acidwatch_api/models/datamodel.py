from __future__ import annotations

from typing import Any, Literal, Optional, Dict, TypeAlias
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class _BaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ModelInput(_BaseModel):
    model_id: str
    parameters: dict[str, bool | float | int | str]


class Conditions(_BaseModel):
    """Simulation conditions.
    temperature is in degrees Celsius. Adapters that require Kelvin must
    convert internally.
    """

    temperature: float = 25
    pressure: float = 10


class Simulation(_BaseModel):
    concentrations: dict[str, int | float]
    conditions: Conditions = Field(default_factory=Conditions)
    models: list[ModelInput] = Field(min_length=1)


class ModelResult(_BaseModel):
    concentrations: dict[str, int | float]
    panels: list[AnyPanel]


class SimulationResult(_BaseModel):
    status: Literal["done", "pending"]
    input: Simulation
    results: list[ModelResult]


class SweepRange(_BaseModel):
    """A linear, inclusive range that is sampled at ``steps`` points."""

    min: float
    max: float
    steps: int = Field(default=10, ge=2, le=25)

    @model_validator(mode="after")
    def _check_bounds(self) -> "SweepRange":
        if self.max <= self.min:
            raise ValueError("max must be greater than min")
        return self

    def values(self) -> list[float]:
        step = (self.max - self.min) / (self.steps - 1)
        return [self.min + step * i for i in range(self.steps)]


class CreateSweep(_BaseModel):
    """Request body for starting a concentration sweep.

    A sweep runs a single model configuration (the ``models`` chain) once for
    each value in ``range``, substituting ``swept_substance`` in
    ``concentrations`` with that value.
    """

    swept_substance: str
    range: SweepRange
    concentrations: dict[str, int | float]
    conditions: Conditions = Field(default_factory=Conditions)
    models: list[ModelInput] = Field(min_length=1)


class SweepPoint(_BaseModel):
    value: float
    simulation_id: UUID
    status: Literal["done", "pending", "error"]
    error: str | None = None
    concentrations: dict[str, int | float]


class SweepResult(_BaseModel):
    status: Literal["done", "pending"]
    swept_substance: str
    values: list[float]
    concentrations: dict[str, int | float]
    conditions: Conditions
    models: list[ModelInput]
    points: list[SweepPoint]


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
