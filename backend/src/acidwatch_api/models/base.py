from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated, Any, Generic, Iterable, Literal, Self, TypeVar, TypedDict, Unpack, cast, overload
import typing
from pydantic.config import JsonDict
from pydantic.fields import FieldInfo
from typing_extensions import Doc
from pydantic import BaseModel, ConfigDict, Field, model_validator
from uuid import UUID
import inspect


ADAPTERS: dict[str, type[BaseAdapter]] = {}


type Compound = str
type Concs = dict[Compound, float | None]
type Settings = dict[str, str]
type Metadata = dict[str, Any]
type ParamType = int | float | bool | str
T = TypeVar("T", int, float, bool, str)


class Unit(StrEnum):
    # Temperature in Kelvin
    KELVIN = "kelvin"

    # Pressure in absolute bars
    BAR_A = "Bar A"


class AcidwatchParameter(TypedDict):
    __type__: Literal["AcidwatchParameter"]
    label: str | None
    description: str | None
    unit: str | None
    custom_unit: str | None
    default: ParamType
    choices: list[ParamType] | None
    min: ParamType | None
    max: ParamType | None


def Parameter(
    default: T,
    *,
    label: str | None = None,
    description: str | None = None,
    unit: Unit | None = None,
    custom_unit: str | None = None,
    min: T | None = None,
    max: T | None = None,
    choices: Iterable[T] | None = None,
) -> T:
    extra: AcidwatchParameter = {
        "__type__": "AcidwatchParameter",
        "label": label,
        "description": description,
        "unit": str(unit) if unit else None,
        "custom_unit": custom_unit,
        "min": min,
        "max": max,
        "choices": list(choices) if choices is not None else None,
    }

    return Field(
        default=default,
        le=max,
        ge=min,
        json_schema_extra=cast(JsonDict, extra),
    )


class BaseParameters(BaseModel):
    def __init_subclass__(cls, **kwargs: Unpack[ConfigDict]) -> None:
        super().__init_subclass__(**kwargs)

        breakpoint()

        for name, field in cls.model_fields.items():
            extra = field.json_schema_extra
            if not isinstance(extra, dict) or extra["__type__"] != "AcidwatchParameter":
                raise TypeError(f"In {cls}, field {name} must be defined using acidwatch.Parameter")

    @model_validator(mode="after")
    def _validate_parameters(self) -> Self:
        return self


def _get_parameters_type(cls: type[BaseAdapter]) -> type[BaseParameters] | None:
    type_hints = typing.get_type_hints(cls)
    if (th := type_hints.get("parameters")) is None:
        return None
    assert issubclass(th, BaseParameters)
    return th


class BaseAdapter:
    def __init__(self, concentrations: dict[str, float | int], parameters: JsonDict) -> None:
        parameters_type = _get_parameters_type(type(self))
        if parameters and parameters_type is None:
            raise ValueError(f"{type(self)} expected no parameters, got {parameters}")
        elif parameters_type is not None:
            self.parameters = parameters_type.model_validate(parameters)

        self.concentrations = concentrations

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        type_hints = typing.get_type_hints(cls)

        # Ensure that 'parameters' is correct
        if (ptype := type_hints.get("parameters")) is None and hasattr(cls, "parameters"):
            raise TypeError(f"{cls} declares field 'parameters', but is not type-hinted")
        if ptype is not None:
            if not issubclass(ptype, BaseParameters):
                raise TypeError(f"{cls} declares field 'parameters', but it's not a subclass of BaseParameters")

        # Automatically register adapter
        if (other_cls := ADAPTERS.get(cls.model_id)) is not None:
            raise ValueError(f"Model adapter with ID '{cls.model_id}' has already been declared in {inspect.getfile(other_cls)}")

        ADAPTERS[cls.model_id] = cls  # type: ignore


    model_id: Annotated[str, Doc("Unique model identifier")]
    model_name: Annotated[str, Doc("User-friendly model name which is displayed in the frontend")]
    concentrations: Annotated[dict[str, float | int], Doc("Base default concentrations")]
    extra_concentrations: Annotated[list[str], Doc("Additional concentrations that the user may provide")]

    async def run(
        self,
    ) -> dict[str, float]:
        raise NotImplementedError()

    @classmethod
    async def user_has_access(cls, user: User) -> bool:
        return True
