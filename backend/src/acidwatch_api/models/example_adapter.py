from __future__ import annotations
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
        unit="%",
        # Default value
        default=50,
    )


class ExampleAdapter(BaseAdapter):
    """This is an example on how to write model adapters"""

    model_id = "example"

    # if a model is based on a python package one would typically do:
    # model_version = package_name.__version__
    #
    # It's also possible to modify this during the run function.
    # It will be used to provide meta information of any content returned
    # in the run function
    model_version = "1.0.0"

    # Every model requires a human-readable model name. This text will be
    # displayed in the frontend.
    display_name = "Example"

    # Every model has a set of initial concentrations of substances.
    #
    # This property must contain a list of valid chemical substances
    # (eg. 'HNO2', but not 'ASDF') indicating it's possible for the user to
    # supply it.
    #
    # The frontend has a set of substances that by default is shown to the user,
    # any substance other than those will be possible for the user to add from a
    # drop down menu. If the adapter does not specify one of the default ones,
    # they will not be shown.
    #
    # The exception is CO2, which must not be specified as it's the solvent.
    #
    # Note that all concentrations provided to the adapter through
    # self.concentrations will be in the unit PPM. Likewise, all concentrations
    # provided in the results will be treated as PPM by the frontend. Make sure
    # to adhere to this unit in the adapter interface.
    valid_substances = ["H2O"]

    parameters: ExampleParameters

    async def run(self) -> dict[str, float]:
        # At this point the adapter can do whatever they want with the
        # concentrations. The first returned object is considered the output
        # concentrations and must be of the same type as self.concentrations
        # (dict[str, number]), and the unit of number must be in ppm.
        return self.concentrations
