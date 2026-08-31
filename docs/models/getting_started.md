# How to add your own Model

## Introduction

AcidWatch is an application made to facilitate running multiple CO<sub>2</sub>
impurities simulation models with the same user interface. This makes it easier
for a general user to try out different models and compare their differences at
various conditions. In order to support the various ways of creating a model, we
have made a structure which provides each model with their entirely own
container. At the same time we need a common way for the application itself to
know a bit about the model, what type of parameters it needs addressed etc. In
this section we will provide a complete overview of what is necessary to get
going with adding your own model, and how to run it.

## Model Definition

The application (front-end and command line interface) needs information about a
model in order to present it, and know which values the model needs as input. A
model is described in a python file within the `acidwatch_models` package. This is
a self-contained python package in the AcidWatch repository. Whenever we want to
add another model, a new definition must be added. In its simplest form it will
be like this:

```python
from acidwatch_models import BaseAdapter

class ExampleAdapter(BaseAdapter):
    model_id = "example"
    description = "Example description"
```

An `ExampleAdapter` can already be found here:

`acidwatch_models.definitions.example.ExampleAdapter`. It describes the model
identifier, metadata, accepted substances, and parameters.

The `BaseAdapter` and `BaseParameters` provide tooling for verifying the
structure any adapters and parameters made. Hence we can ensure that we are in a
good state before anything is added.

Feel free to copy the example and rename it to suit your model. With this in
place one can already start AcidWatch locally and it will show the model
available.

An easy way of starting the setup so far is to use docker compose with what we have:

```sh
docker compose --watch frontend backend
```

This will initiate the frontend and backend allowing you to visit the local
representation of the page from your browser: localhost:5173. The watch allows
makes docker rebuild if you do eddits, a convenient way to work.

We need to also include the new adapter by adding it to:

`acidwatch_models.definitions.__init__.py`, and in `acidwatch_models.registry.py`

## Model Worker

Now we need a way to run the model as well. AcidWatch facilitates an environment
for the model to run in, post progress and return results. The
`acidwatch_worker_runtime` handles this for you. The combination of a runtime,
the environment configuration and model implementation is defined as a worker in
AcidWatch.

Each model worker is an independent `uv` project with its own virtual
environment described with a `pyproject.toml` file and a corresponding
`lockfile`. Dependencies added here do not affect the AcidWatch project or any
other workers. The `Dockerfile` can be modified to accommodate any model
requirements. Please see documentation from `uv` and `Docker` if there are
questions related to those tools.

An example has been pre-made that fits with the example definition,
and can be found in the workers folder. Feel free to copy the directory and make
a new name for the model. Be careful to change from using ExampleAdapter to the
name chosen for your model.

The following must be updated:
- `__init__.py`, `__main__.py`, `adapter.py`.
- `pyproject.toml`, and corresponding foldername
- `Dockerfile` for project name and entrypoint

Regular commands to create a working python environment like `uv sync` can now
be used. Likewise with creating a docker container.

## Model Implementation

In the implementation we build on the same definition added previously in
the `acidwatch_models` package. An implementation in its simplest form looks
like this:

```python
from acidwatch_models import RunResult
from acidwatch_models.definitions.example import (
    ExampleAdapter as ExampleDefinition,
)

class ExampleAdapter(ExampleDefinition):
    async def run(self) -> RunResult:
        return (
            [],
            TextResult(data="Result from example"),
        )
```

A slightly more elaborate example is shown in the repository example: 
`acidwatch_worker_example.adapter.ExampleAdapter`, which returns `Phase` as well

## Run the worker standalone

Use the shared standalone runner while developing the calculation:

```python
from acidwatch_worker_example import ExampleAdapter from
acidwatch_worker_runtime import run_adapter_standalone

result = run_adapter_standalone(
            ExampleAdapter,
            {"H2O": 10},
            parameters={"spontaneouslyCombust": 25}
         )

assert result.error is None print(result.phases)
```

This runs the same adapter implementation used by AcidWatch, but does not
require any of the infrastructure that AcidWatch uses.

## Test the worker

```sh
uv run pytest
```

Tests can use `run_adapter_standalone` for calculation development and
`run_adapter_job` for the complete AcidWatch adapter contract.

## Run with AcidWatch

The simplest way of handling necessary infrastructure is to add the worker to
the docker compose file. See #Architecture if you would like to know how the
model is running in AcidWatch, but it is not required to know how it works in
order to test things out.

Open the `docker-compose.yml` file and add the worker like any of the other
workers have been added and run the complete setup with `docker compose up`
(please see from docker compose if there are questions related to how the file
is structured)

