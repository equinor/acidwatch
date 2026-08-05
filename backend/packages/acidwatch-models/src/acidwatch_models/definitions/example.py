from acidwatch_models import BaseAdapter, BaseParameters, Parameter


class ExampleParameters(BaseParameters):
    spontaneously_combust: int = Parameter(
        default=50,
        label="Spontaneously combust",
        description="The rate at which atoms will spontaneously disappear",
        min=0,
        max=100,
        unit="%",
    )


class ExampleAdapter(BaseAdapter):
    model_id = "example"
    display_name = "Example"
    description = "Example model used as the adapter contribution template."
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O"]
    parameters: ExampleParameters
