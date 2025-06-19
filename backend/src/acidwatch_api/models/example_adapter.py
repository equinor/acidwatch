from __future__ import annotations
from typing import Annotated, Any, Self, override
from acidwatch_api.models.base import BaseAdapter, Setting, Concs, Metadata, Settings
from pydantic import BaseModel


class ExampleSettings(BaseModel):
    spontaneously_combust: Annotated[int, Setting(
        # Label that will be shown to the user
        label="Spontaneously combust",
        # Description
        description="The rate at which atoms will spontaneously disappear",
        # Minimum (optional)
        min=0,
        # Maximum (optional)
        max=100,
        # Which unit to show this as
        unit="%",
        # Default value
        default=50,
    )]

    spontaneously_combust_two: Annotated[int, Setting(
        # Label that will be shown to the user
        label="Spontaneously combust",
        # Description
        description="The rate at which atoms will spontaneously disappear",
        # Which unit to show this as
        unit="%",
    )]


class ExampleAdapter(BaseAdapter):
    """This is an example on how to write model adapters"""

    class Settings:
        sponta: Annotated[int, Setting]

        temperature: int = Param(label="Temperature", min=200, max=400, unit="%")

    model_id = "example"

    # Every model requires a human-readable model name. This text will be
    # displayed in the frontend.
    model_name = "Example"

    # Every model has a set of initial concentrations of substances.
    #
    # This function must return a dict that maps a valid chemical substance
    # (eg. 'HNO2', but not 'ASDF') to a floating point value between 0 and
    # 1,000,000 (in ppm) or None, indicating it's possible for the user to
    # supply it, but it's disabled by default.
    #
    # The exception is CO2, which must not be specified as it's the solvent.
    concs = {
        "HNO": 10,
    }

    # Models can have settings that allow the user to tweak some behaviour.

    # These are rendered in the frontend as various controls. This function
    # returns a list of possible settings for this model, along with a default
    # value.

    settings = ExampleSettings

    @override
    @classmethod
    async def run(cls, concs: Concs, settings: Settings) -> Concs:
        settings.spontaneously_combust
        print(settings)
        raise ValidationError(name="spontan", reason="You suck")
        return concs

    @classmethod
    async def does_user_have_access(cls) -> bool:
        return True
