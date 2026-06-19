from __future__ import annotations
from rich.progress import Progress
from acidwatch import Client
from typing import Annotated
from typer import Typer, Option
from acidwatch.cli.model import model_app
from rich import print as rprint


app = Typer(
    name="AcidWatch CLI",
    no_args_is_help=True,
    pretty_exceptions_enable=False,
    rich_markup_mode=None,
)
app.add_typer(model_app)


@app.command()
def run(
    model_id: str,
    concentration: list[str],
    parameter: Annotated[
        list[str],
        Option("-p", "--parameter", default_factory=list),
    ],
) -> None:
    print(f"Running {model_id} model with the following settings:")
    temperature = 25
    pressure = 10

    concs: dict[str, float] = {}
    for c in concentration:
        key, val = c.split("=")
        if key == "T":
            temperature = int(val)
        elif key == "P":
            pressure = int(val)
        else:
            concs[key] = float(val)

    params: dict[str, str] = {}
    for p in parameter:
        key, val = p.split("=")
        params[key] = val

    print()
    print("Concentrations:")
    for key, fval in concs.items():
        rprint(f"  {key}: {val} ppm")

    print()
    print("Conditions:")
    rprint(f"  Temperature: {temperature} K")
    rprint(f"  Pressure: {pressure} bar a")

    print()
    print("Parameters:")
    if params:
        for key, val in params.items():
            rprint(f"  {key}: {val}")
    else:
        print("  None specified")

    with Client() as session:
        print()
        with Progress(transient=True) as progress:
            progress.add_task("Simulating", total=None)
            sim_result = session.run_model(
                model_id,
                concs,
                params,
                temperature=temperature,
                pressure=pressure,
            )

        print("Result:")
        rprint(sim_result)
