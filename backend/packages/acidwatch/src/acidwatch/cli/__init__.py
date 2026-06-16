from __future__ import annotations
from typer import Typer
from acidwatch.cli.model import model_app


app = Typer(
    name="AcidWatch CLI",
    no_args_is_help=True,
    pretty_exceptions_enable=False,
    rich_markup_mode=None,
)


app.add_typer(model_app)


__all__ = ["app"]
