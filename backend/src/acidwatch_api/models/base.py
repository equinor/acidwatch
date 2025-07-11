from __future__ import annotations
from enum import StrEnum
from typing import (
    Annotated,
    Any,
    Iterable,
    Literal,
    Self,
    TypeVar,
    TypedDict,
    Unpack,
    cast,
    no_type_check,
    TypeAlias,
)
import typing
from acidwatch_api.authentication import acquire_token_for_downstream_api
from acidwatch_api.models.datamodel import AnyResult
from fastapi import HTTPException
import httpx
from pydantic.alias_generators import to_camel
from pydantic.config import JsonDict
from typing_extensions import Doc
from pydantic import BaseModel, ConfigDict, Field, model_validator
import inspect


ADAPTERS: dict[str, type[BaseAdapter]] = {}


Compound: TypeAlias = str
Concs: TypeAlias = dict[Compound, float | None]
Settings: TypeAlias = dict[str, str]
Metadata: TypeAlias = dict[str, Any]
ParamType: TypeAlias = int | float | bool | str
RunResult: TypeAlias = (
    dict[str, float | int] | tuple[dict[str, float | int], *tuple[AnyResult, ...]]
)
T = TypeVar("T", int, float, bool, str)


def get_concs(result: RunResult) -> dict[str, int | float]:
    if isinstance(result, dict):
        return result
    return result[0]


def get_metas(result: RunResult) -> list[AnyResult]:
    if isinstance(result, dict):
        return []
    return list(result[1:])


class Unit(StrEnum):
    # Temperature in Kelvin
    KELVIN = "K"

    # Pressure in absolute bars
    BAR_A = "bara"


class AcidwatchParameter(TypedDict):
    __type__: Literal["AcidwatchParameter"]
    label: str | None
    description: str | None
    unit: str | None
    custom_unit: str | None
    default: ParamType
    choices: list[ParamType] | None


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
        "default": default,
        "label": label,
        "description": description,
        "unit": str(unit) if unit else None,
        "custom_unit": custom_unit,
        "choices": list(choices) if choices is not None else None,
    }

    return Field(
        default=default,
        le=max,
        ge=min,
        json_schema_extra=cast(JsonDict, extra),
    )


class BaseParameters(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    @classmethod
    @no_type_check
    def __pydantic_init_subclass__(cls, **kwargs: Unpack[ConfigDict]) -> None:
        super().__pydantic_init_subclass__(**kwargs)

        for name, field in cls.model_fields.items():
            extra = field.json_schema_extra
            if not isinstance(extra, dict) or extra["__type__"] != "AcidwatchParameter":
                raise TypeError(
                    f"In {cls}, field {name} must be defined using acidwatch.Parameter"
                )

    @model_validator(mode="after")
    def _validate_parameters(self) -> Self:
        return self


def _get_parameters_type(cls: type[BaseAdapter]) -> type[BaseParameters] | None:
    type_hints = typing.get_type_hints(cls)
    if (th := type_hints.get("parameters")) is None:
        return None
    assert issubclass(th, BaseParameters)
    #  Mypy 1.16.0 is incorrectly thinking that th is 'Any'
    return th  # type: ignore


def get_parameters_schema(cls: type[BaseAdapter]) -> Any:
    if (ptype := _get_parameters_type(cls)) is None:
        return {}
    return ptype.model_json_schema()["properties"]


class BaseAdapter:
    def __init__(
        self,
        concentrations: dict[str, float | int],
        parameters: dict[str, str | bool | int | float],
        jwt_token: str | None,
    ) -> None:
        parameters_type = _get_parameters_type(type(self))
        if parameters and parameters_type is None:
            raise ValueError(f"{type(self)} expected no parameters, got {parameters}")
        elif parameters_type is not None:
            self.parameters = parameters_type.model_validate(parameters)

        self.concentrations = concentrations
        self.jwt_token = jwt_token

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        type_hints = typing.get_type_hints(cls)

        # Ensure that 'parameters' is correct
        if (ptype := type_hints.get("parameters")) is None and hasattr(
            cls, "parameters"
        ):
            raise TypeError(
                f"{cls} declares field 'parameters', but is not type-hinted"
            )
        if ptype is not None:
            if not issubclass(ptype, BaseParameters):
                raise TypeError(
                    f"{cls} declares field 'parameters', but it's not a subclass of BaseParameters"
                )

        # Automatically register adapter
        if (other_cls := ADAPTERS.get(cls.model_id)) is not None:
            raise ValueError(
                f"Model adapter with ID '{cls.model_id}' has already been declared in {inspect.getfile(other_cls)}"
            )

        ADAPTERS[cls.model_id] = cls

    model_id: Annotated[str, Doc("Unique model identifier")]
    display_name: Annotated[
        str, Doc("User-friendly model name which is displayed in the frontend")
    ]
    valid_substances: Annotated[list[str], Doc("Substances that this model can use")]

    authentication: Annotated[bool, Doc("Require authentication")] = False

    scope: Annotated[str | None, Doc("Scope for accessing this model in EntraID")] = (
        None
    )

    base_url: Annotated[str | None, Doc("BaseURL for accessing a remote model")] = None

    # parameters: Annotated[type[BaseParameters], Doc("Additional parameters for model")]

    @property
    def client(self) -> httpx.AsyncClient:
        if self.base_url is None:
            raise ValueError(f"{type(self)} must specify 'base_url' field")

        headers: dict[str, str] = {}
        if self.scope is not None:
            if self.jwt_token is None:
                raise HTTPException(401, "Must be authenticated")
            token = acquire_token_for_downstream_api(self.scope, self.jwt_token)
            headers["Authorization"] = f"Bearer {token}"

        return httpx.AsyncClient(base_url=self.base_url, headers=headers)

    async def run(self) -> RunResult:
        raise NotImplementedError()
