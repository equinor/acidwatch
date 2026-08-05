from __future__ import annotations

from typing import Any, Literal, Optional, Dict, TypeAlias

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


class Phase(_BaseModel):
    kind: Literal["aqueous", "co2-rich"]
    fraction: float
    concentrations: dict[str, int | float]


class Simulation(_BaseModel):
    concentrations: dict[str, int | float]
    conditions: Conditions = Field(default_factory=Conditions)
    models: list[ModelInput] = Field(min_length=1)

    @property
    def phases(self) -> list[Phase]:
        return [
            Phase(kind="co2-rich", fraction=1.0, concentrations=self.concentrations)
        ]


class ModelResult(_BaseModel):
    phases: list[Phase]
    panels: list[AnyPanel]


class SimulationResult(_BaseModel):
    status: Literal["done", "pending", "error"]
    input: Simulation
    results: list[ModelResult]
    error: str | None = None


class AxisRange(_BaseModel):
    """A linear, inclusive range from min to max with a given step size."""

    min: float
    max: float
    step: float = Field(default=10, gt=0)

    @model_validator(mode="after")
    def _check_bounds(self) -> "AxisRange":
        if self.max <= self.min:
            raise ValueError("max must be greater than min")
        if self.step > (self.max - self.min):
            raise ValueError("step must not exceed the range (max - min)")
        return self

    def values(self) -> list[float]:
        result = []
        current = self.min
        while current <= self.max + 1e-9:
            result.append(current)
            current += self.step
        return result

    @property
    def num_points(self) -> int:
        return len(self.values())


class Axis(_BaseModel):
    substance: str
    range: AxisRange


class CreateGridSimulation(_BaseModel):
    """Request body for starting a grid simulation.

    Runs a model chain once for each point in the cartesian product of the
    axes, substituting each axis's substance in ``concentrations`` with the
    corresponding value.
    """

    axes: list[Axis] = Field(min_length=1, max_length=2)
    concentrations: dict[str, int | float]
    conditions: Conditions = Field(default_factory=Conditions)
    models: list[ModelInput] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_axes(self) -> "CreateGridSimulation":
        substances = [axis.substance for axis in self.axes]
        if len(substances) != len(set(substances)):
            raise ValueError("Each axis must use a unique substance")

        total = 1
        for axis in self.axes:
            total *= axis.range.num_points
        if total > 100:
            raise ValueError(
                f"Grid too large: {total} points exceeds the maximum of 100"
            )
        return self


class GridSimulationResult(_BaseModel):
    status: Literal["done", "pending"]
    axes: list[Axis]
    simulations: list[SimulationResult]


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
    description_html: str
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
