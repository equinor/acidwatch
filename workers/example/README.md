# Example worker

This package is the reference implementation for contributing a model
to AcidWatch. It shows how to define the model contract, implement its
calculation, test it without infrastructure, and start it as a deployed worker.

## Set up the worker

From this directory:

```sh
uv sync
```

Each model worker is an independent uv project with its own virtual environment
and lockfile. Dependencies added here do not affect the AcidWatch project or any
other workers.

## Run the worker standalone

Use the shared standalone runner while developing the calculation:

```python
from acidwatch_worker_example import ExampleAdapter
from acidwatch_worker_runtime import run_adapter_standalone

result = run_adapter_standalone(
    ExampleAdapter,
    {"H2O": 10},
    parameters={"spontaneouslyCombust": 25},
)

assert result.error is None
print(result.phases)
```

This runs the same adapter implementation used by AcidWatch, but does not
require a broker, API, database, or frontend.

## Implement a model

The worker has two parts:

- `acidwatch_models.definitions.example.ExampleAdapter` describes the model
  identifier, metadata, accepted substances, and parameters.
- `acidwatch_worker_example.adapter.ExampleAdapter` implements the asynchronous
  `run()` method and returns AcidWatch phases and result panels.

Keep the model-specific calculation and third-party dependencies inside this
worker package. Use the shared model types only at the adapter boundary.

## Test the worker

```sh
uv run pytest
```

Tests can use `run_adapter_standalone` for calculation development and
`run_adapter_job` for the complete AcidWatch adapter contract.

## Run with AcidWatch

The deployed entry point reads `BROKER_URL` and optionally `BROKER_TRANSPORT`:

```sh
BROKER_URL=amqp://localhost:5672 uv run python -m acidwatch_worker_example
```

The worker then consumes jobs for its model identifier and publishes
heartbeats and results using the shared worker runtime.
