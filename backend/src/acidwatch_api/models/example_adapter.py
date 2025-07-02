from __future__ import annotations
from typing import override
from acidwatch_api.models.base import BaseAdapter, BaseParameters, Parameter


class ExampleParameters(BaseParameters):
    spontaneously_combust: int = Parameter(
        # Label that will be shown to the user
        label="Spontaneously combust",
        # Description
        description="The rate at which atoms will spontaneously disappear",
        # Minimum (optional)
        min=0,
        # Maximum (optional)
        max=100,
        # Which unit to show this as
        custom_unit="%",
        # Default value
        default=50,
    )


class ExampleAdapter(BaseAdapter):
    """This is an example on how to write model adapters"""

    model_id = "example"

    # Every model requires a human-readable model name. This text will be
    # displayed in the frontend.
    display_name = "Example"

    # Every model has a set of initial concentrations of substances.
    #
    # This function must return a dict that maps a valid chemical substance
    # (eg. 'HNO2', but not 'ASDF') to a floating point value between 0 and
    # 1,000,000 (in ppm) or None, indicating it's possible for the user to
    # supply it, but it's disabled by default.
    #
    # The exception is CO2, which must not be specified as it's the solvent.
    valid_substances = ["H2O"]

    parameters: ExampleParameters

    @override
    async def run(self) -> dict[str, float]:
        return self.concentrations
