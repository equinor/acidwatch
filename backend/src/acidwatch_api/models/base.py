from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Annotated, Any, Generic, Literal, TypeVar, TypedDict, overload
from pydantic.fields import FieldInfo
from typing_extensions import Doc
from pydantic import BaseModel, Field
from uuid import UUID
import inspect


ADAPTERS: dict[str, type[BaseAdapter[BaseModel]]] = {}


type Compound = str
type Concs = dict[Compound, float | None]
type Settings = dict[str, str]
type Metadata = dict[str, Any]


@dataclass
class Setting:
    label: str
    default: int | float | None = None
    description: str | None = None
    min: int | float | None = None
    max: int | float | None = None
    unit: str | None = None


class BaseAdapter():
    Settings: type[Any]

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()

        # Automatically register adapter
        if (other_cls := ADAPTERS.get(cls.model_id)) is not None:
            raise ValueError(f"Model adapter with ID '{cls.model_id}' has already been declared in {inspect.getfile(other_cls)}")

        ADAPTERS[cls.model_id] = cls  # type: ignore


    model_id: Annotated[str, Doc("Unique model identifier")]
    model_name: Annotated[str, Doc("User-friendly model name which is displayed in the frontend")]
    concs: Annotated[dict[str, float | int | None ], Doc("Base default concentrations")]
    settings: Annotated[type[TSettings], Doc("Model settings")] = []

    @classmethod
    async def run(
        cls,
        concentrations: Concs,
        parameters: Settings,
    ) -> Concs | tuple[Concs, Metadata]:
        raise NotImplementedError()

    @classmethod
    async def user_has_access(cls, user: User) -> bool:
        return True
