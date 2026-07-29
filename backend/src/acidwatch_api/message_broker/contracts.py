from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from acidwatch_api.models.datamodel import AnyPanel, Conditions, Phase


class _Message(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AdapterJob(_Message):
    model_input_id: UUID
    model_id: str
    concentrations: dict[str, int | float]
    parameters: dict[str, bool | float | int | str]
    conditions: Conditions
    access_token: str | None = Field(default=None, repr=False)


class AdapterResult(_Message):
    model_input_id: UUID
    phases: list[Phase] = Field(default_factory=list)
    panels: list[AnyPanel] = Field(default_factory=list)
    error: str | None = None
