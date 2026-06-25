from __future__ import annotations
from rich.panel import Panel
from rich import print as rprint
from rich.table import Table
from rich.pretty import pretty_repr
from acidwatch import Client
from typer import Typer


model_app = Typer(name="model")


@model_app.command("list")
def model_list() -> None:
    table = Table("ID", "Name", title="Available AcidWatch models")

    with Client() as session:
        for model in session.list_models():
            if model.access_error is not None:
                continue

            table.add_row(model.model_id, model.display_name)

    rprint(table)


@model_app.command("show")
def model_show(model_id: str) -> None:
    with Client() as session:
        for model in session.list_models():
            if model.model_id == model_id:
                break

        else:
            rprint("No such model: ", model_id)

    info_table = Table(show_header=False)
    info_table.add_row("Model ID", model.model_id)
    info_table.add_row("Display name", model.display_name)
    info_table.add_row("Valid substances", pretty_repr(model.valid_substances))
    rprint(info_table)

    if model.parameters:
        parameter_table = Table(
            "ID", "Label", "Type", "Default value", title="Parameters"
        )
        for param_id, param in model.parameters.items():
            parameter_table.add_row(
                param_id, param.label, param.type, str(param.default)
            )
        rprint(parameter_table)

    rprint(Panel(model.description, title="Description", expand=False))


__all__ = ["model_app"]
