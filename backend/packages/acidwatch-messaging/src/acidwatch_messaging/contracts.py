from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from acidwatch_messaging.datamodel import AnyPanel, Conditions, Phase


class _Message(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConcentrationBounds(_Message):
    """Allowed range, in ppm, for the concentration of one substance."""

    min: int | float | None = None
    max: int | float | None = None


def concentration_errors(
    concentrations: dict[str, int | float],
    *,
    valid_substances: list[str],
    bounds: dict[str, ConcentrationBounds],
) -> dict[str, list[str]]:
    """Validation errors per substance; empty when the input is acceptable."""
    errors: dict[str, list[str]] = {
        substance: ["Extra inputs are not permitted"]
        for substance in concentrations
        if substance != "CO2" and substance not in valid_substances
    }
    if errors:
        return errors

    for substance, amount in concentrations.items():
        limits = bounds.get(substance)
        if limits is None:
            continue
        if limits.min is not None and amount < limits.min:
            errors.setdefault(substance, []).append(f"must be >= {limits.min} ppm")
        if limits.max is not None and amount > limits.max:
            errors.setdefault(substance, []).append(f"must be <= {limits.max} ppm")
    return errors


class ModelDescriptor(_Message):
    """Everything the API needs to know about a model.

    Workers announce this, so the API has no built-in list of models.
    """

    model_id: str
    display_name: str
    description: str
    category: Literal["ChemicalEquilibrium", "PhaseEquilibrium"]
    valid_substances: list[str]
    concentration_bounds: dict[str, ConcentrationBounds] = Field(default_factory=dict)
    # JSON schema properties of the model's parameters, keyed by parameter name
    parameters: dict[str, Any] = Field(default_factory=dict)
    # When the worker's image was built. None when it does not run from an image.
    build_time: datetime | None = None

    def concentration_errors(
        self, concentrations: dict[str, int | float]
    ) -> dict[str, list[str]]:
        return concentration_errors(
            concentrations,
            valid_substances=self.valid_substances,
            bounds=self.concentration_bounds,
        )


class AdapterJob(_Message):
    model_input_id: UUID
    model_id: str
    concentrations: dict[str, int | float]
    parameters: dict[str, bool | float | int | str]
    conditions: Conditions


class AdapterResult(_Message):
    model_input_id: UUID
    phases: list[Phase] = Field(default_factory=list)
    panels: list[AnyPanel] = Field(default_factory=list)
    error: str | None = None


class Heartbeat(_Message):
    model_id: str
    instance_id: str
    timestamp: datetime
    job_id: str | None = None
    # Announces the model. Sent with every heartbeat so the API can keep its
    # catalogue of models up to date without a list of its own.
    descriptor: ModelDescriptor | None = None
