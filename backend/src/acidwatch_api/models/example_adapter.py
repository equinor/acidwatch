from typing import Any
from acidwatch_api.models.base import BaseAdapter, Setting, Concs, Metadata


class ExampleAdapter(BaseAdapter):
    """This is an example on how to write model adapters"""

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

    settings = [
        Setting(
            # Internal identifier for this setting
            name="spontaneously_combust",
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
            # Type (any of: int, float, bool)
            type="int",
        )
    ]

    @classmethod
    async def __call__(cls, concs: Concs, settings: dict[str, str]) -> Concs:
        return {}

    @classmethod
    async def does_user_have_access(cls) -> bool:
        return True
