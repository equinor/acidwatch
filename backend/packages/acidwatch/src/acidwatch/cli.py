from __future__ import annotations
from pydantic.alias_generators import to_camel

from typer import Typer
from httpx import Client
from pydantic import BaseModel, RootModel, ConfigDict
from rich.console import Console
from rich.table import Table

app = Typer()
console = Console()


API_URL = "https://backend-acidwatch-prod.radix.equinor.com"


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    access_error: str | None
    model_id: str
    display_name: str


@app.command("list")
def list_models() -> None:
    with Client(base_url=API_URL) as session:
        response = session.get("/models")
        assert response.status_code == 200

        klass = RootModel[list[Model]]

        table = Table(title="Available AcidWatch models")
        table.add_column("ID")
        table.add_column("Name")
        for model in klass.model_validate_json(response.content).root:
            if model.access_error is not None:
                continue

            table.add_row(model.model_id, model.display_name)

        console.print(table)


@app.command()
def run() -> None:
    pass


if __name__ == "__main__":
    app()
