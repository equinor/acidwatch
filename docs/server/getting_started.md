# Adding a model adapter

Use `ExampleAdapter` as the template:

- [Lightweight definition](https://github.com/equinor/acidwatch/blob/main/backend/packages/acidwatch-models/src/acidwatch_models/definitions/example.py)
- [Worker implementation](https://github.com/equinor/acidwatch/blob/main/workers/example/src/acidwatch_worker_example/adapter.py)
- [Worker package](https://github.com/equinor/acidwatch/tree/main/workers/example)

The definition is installed by the API. The implementation is installed only
in its worker image. Do not add model-specific dependencies to
`acidwatch-api`, `acidwatch-models`, or `acidwatch-messaging`.

## 1. Define the model

Copy `definitions/example.py` to a file named after the model.

The definition must provide:

- `model_id`: stable queue and API identifier using lowercase snake case.
- `display_name`: user-facing name.
- `description`: Markdown shown in the model overview.
- `category`: `ChemicalEquilibrium` or `PhaseEquilibrium`.
- `valid_substances`: accepted input formulas. Do not include CO2 because it is
  the solvent.
- `parameters`: an optional `BaseParameters` type.

Every parameter field must use `Parameter`:

```python
from acidwatch_models import BaseAdapter, BaseParameters, Parameter


class MyParameters(BaseParameters):
    conversion: float = Parameter(
        default=0.5,
        label="Conversion",
        min=0,
        max=1,
    )


class MyAdapter(BaseAdapter):
    model_id = "my_model"
    display_name = "My model"
    description = "Description shown to users."
    category = "ChemicalEquilibrium"
    valid_substances = ["H2O", "H2S"]
    parameters: MyParameters
```

The API uses this class to reject unknown substances and parameters before a
job is published. It also generates the `/models` response and frontend form
from the same declaration.

Export the definition from `acidwatch_models.definitions` and add it to
`acidwatch_models.registry.get_adapters()`. This is the only API-side
registration. `ExampleAdapter` itself is deliberately not exported or
registered because it is a template, not a selectable model.

## 2. Create the worker package

Copy `workers/example` to `workers/<model>` and rename:

- the project in `pyproject.toml` to `acidwatch-worker-<model>`;
- the import package to `acidwatch_worker_<model>`;
- `ExampleAdapter` to the concrete adapter name;
- the package and module names in the Dockerfile.

Declare model-specific libraries only in the worker's `pyproject.toml`.

The concrete adapter subclasses the lightweight definition and implements
`run()`:

```python
from acidwatch_models import RunResult
from acidwatch_models.datamodel import Phase
from acidwatch_models.definitions.my_model import (
    MyAdapter as MyDefinition,
)


class MyAdapter(MyDefinition):
    async def run(self) -> RunResult:
        return [
            Phase(
                kind="co2-rich",
                fraction=1,
                concentrations=self.concentrations,
            )
        ]
```

`self.concentrations` contains all valid substances in mol ppm, with omitted
values set to zero. Return concentrations in mol ppm. A result is either a list
of `Phase` objects or a tuple containing the phase list followed by result
panels such as `TextResult`, `TableResult`, or `JsonResult`.

For an external HTTP model, set `base_url` from an environment variable and use
`self.client`. For a Python model, import its library only in the worker
package.

## 3. Test the adapter

The example test executes the same typed worker boundary used by the broker:

```sh
uv run --isolated --package acidwatch-worker-example \
  pytest workers/example/tests
```

Add focused tests for parameter handling, output phases, and model failures.
The generic tests verify definitions have valid model names and substances.

## 4. Add deployment wiring

1. Add the worker service to `docker-compose.yml` using its Dockerfile.
2. Add a Radix component using the same Dockerfile.
3. Configure scale-to-zero from `acidwatch.<model_id>`.
4. Create `acidwatch.<model_id>` in Azure Service Bus.
5. Add required model environment variables or secrets to the worker
   component, not the API component.
6. Add the package to the worker matrix in `.github/workflows/python.yaml`.

RabbitMQ declares the queue automatically during local startup. Azure Service
Bus queues must exist before deployment.

## 5. Run locally

The full stack builds every registered worker:

```sh
docker compose up --build
```

Submit a simulation through the API and poll its result. Confirm the worker
receives the job, returns its result through `acidwatch.results`, and the API
persists the result.
