# Architecture

AcidWatch separates the user-facing application, orchestration, model
definitions, and model execution. The API knows what each model accepts, but it
does not install or import model implementations.

## Deployed components

```text
Browser
  |
  | HTTPS/JSON
  v
Frontend -----------> AcidWatch API -----------> SQL database
                           |
                           | AdapterJob
                           v
                  AMQP message broker
                    |             ^
     acidwatch.<model_id>         | acidwatch.results
                    v             |
                 Model worker ----+
                    |
                    +----> Python model library or external model API
```

| Component | Responsibility |
| --- | --- |
| Frontend | Presents models and simulation results. It communicates only with the AcidWatch HTTP API and has no model-specific integration logic. |
| API | Authenticates users, validates model inputs, creates simulation records, orchestrates model chains, publishes jobs, consumes results, and persists results. |
| SQL database | Stores simulations, ordered model inputs, model results, grid simulations, ownership, and status inferred from persisted results. |
| Message broker | Provides durable per-model job queues and the shared result queue. RabbitMQ is used by local Compose; Azure Service Bus is used in Radix. |
| Model worker | Consumes one model queue, executes one concrete adapter implementation, and returns a typed result through the broker. |

## Python package dependencies

```text
acidwatch-api
  +-- acidwatch-models
  +-- acidwatch-messaging
  +-- FastAPI, SQLAlchemy, authentication, telemetry

acidwatch-messaging
  +-- acidwatch-models
  +-- aio-pika
  +-- azure-servicebus

acidwatch-models
  +-- BaseAdapter and BaseParameters
  +-- shared request/result data models
  +-- lightweight model definitions and registry
  +-- no concrete model runtime

acidwatch-worker-<model>
  +-- acidwatch-models
  +-- acidwatch-messaging
  +-- only that model's implementation and dependencies
```

The model definition and implementation are intentionally separate:

- `backend/packages/acidwatch-models/src/acidwatch_models/definitions` contains
  identifiers, descriptions, categories, valid substances, authentication
  metadata, and typed parameters.
- `workers/<model>` contains `run()` and model-specific dependencies.

A worker implementation subclasses its definition. This keeps metadata
single-sourced while ensuring packages such as NeqSim and SolubilityCCS are not
installed in the API or unrelated workers.

## Simulation flow

1. `GET /models` reads the lightweight registry and returns model metadata,
   valid substances, and parameter schemas.
2. `POST /simulations` validates the selected model chain. The API creates one
   database `ModelInput` row per model and links them in execution order.
3. A background task creates an `AdapterJob` for the first model. The message
   contains the model input ID, model ID, concentrations, conditions,
   parameters, and an optional downstream-scoped access token.
4. The API transport assigns a correlation ID and publishes the job to
   `acidwatch.<model_id>`. The reply address is `acidwatch.results`.
5. The corresponding worker consumes the job with a prefetch count of one,
   validates the message, instantiates its concrete adapter, and calls `run()`.
6. The worker merges passthrough concentrations and publishes an
   `AdapterResult` containing phases, optional panels, or an explicit error.
7. The API result consumer matches the correlation ID, persists `ModelResult`,
   and uses the CO2-rich output as the next model's input.
8. The chain is complete when every model input has a persisted result. Clients
   poll the simulation result endpoint; Redis is not involved.

Grid simulations use the same flow. Each grid point is stored as an ordinary
simulation and can progress independently through its selected chain. The grid
result endpoint returns every point in axis order together with its own status,
so clients can render finished points while the remaining ones are still
running.

## Broker transports

`acidwatch-messaging` exposes the same API and worker interfaces for both
transports:

- RabbitMQ uses a durable direct exchange, durable queues, persistent messages,
  acknowledgements, and requeue on transient delivery failures.
- Azure Service Bus is used in Radix. Each worker scales from zero based on its
  job queue while the API consumes the shared results queue.

The API currently has process-local correlation futures and therefore remains a
single replica. Workers are stateless and scale independently from zero.

## Deployment boundaries

Every worker has its own package, Dockerfile, Compose service, and Radix
component. Multi-stage Docker builds copy only the selected installed package
into the runtime image.

- The API image has no Java or model-specific runtime.
- HTTP-based workers are small Python images.
- Gibbs and SolubilityCCS independently install Java and their own libraries.

See [Adding a model adapter](getting_started.md) for the contribution workflow.
