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

## Delivery guarantees and known limitations

The broker persists jobs and results durably, but chain orchestration state is
process-local. These limitations are accepted for the proof of concept, where
adapters complete in roughly a minute, and are recorded here because they must
be addressed before the pipeline is considered production ready.

### Orchestration does not survive an API restart

`run_adapters` awaits each result in an in-memory future and only then
publishes the next job. If the API restarts while a job is in flight:

- No `ModelResult` row is written for the running model. Graceful shutdown
  cancels the future, and `CancelledError` is not caught by the adapter error
  handler, so no error result is recorded either.
- Later models in the chain are never published, because they exist only in the
  interrupted background task.
- The worker still completes and replies. The restarted API consumes that
  result, finds no matching correlation ID, and discards it.
- The simulation therefore reports `pending` indefinitely. There is no startup
  reconciliation, retry, or resume path.

The intended fix is to drive chaining from the result consumer: persist
`ModelResult`, then look up the next model input through
`previous_model_input_id` and publish its job. State then lives in the database
and the broker rather than in a coroutine. Resuming an authenticated chain also
requires a persisted MSAL long-running on-behalf-of token, because the user's
JWT is deliberately not stored.

### Timeout and lock budgets

| Setting | Value | Source |
| --- | --- | --- |
| Adapter request timeout | 300 s | `SETTINGS.adapter_timeout` |
| Service Bus message lock | 60 s | queue default |
| Worker auto lock renewal | 600 s | `MESSAGE_LOCK_RENEWAL_SECONDS` |
| Max delivery count | 10 | queue default |

The 60 second lock is renewed transparently by the worker receiver, so the
effective ceiling is the 600 second renewal budget rather than the lock itself.
The API gives up first, at 300 seconds. A model that runs between five and ten
minutes is therefore recorded as a timeout error even though the worker
succeeds, and its result is discarded on arrival. Beyond ten minutes the lock
is lost, the job becomes visible again, and a second worker replica may execute
it concurrently.

Any change to `adapter_timeout` must keep it below the renewal budget.

### At-least-once delivery

Both transports redeliver rather than drop:

- RabbitMQ requeues unacknowledged messages when a channel or connection
  closes, and the worker transport requeues on handler failure, so a
  deterministically failing job is redelivered until it is dead-lettered.
- Service Bus redelivers on lock expiry or abandonment, up to the max delivery
  count.

A model may therefore execute more than once. `ModelResult.model_input_id` is
unique, so a duplicate result is rejected at the database rather than
corrupting the chain. Once the result consumer also dispatches the next job, it
must publish only when that insert succeeds, and acknowledge only after the
transaction commits.

The API result consumer has no automatic lock renewal. That is safe while the
handler only resolves a future, but moving database writes into that path
brings its runtime closer to the 60 second lock.

## Deployment boundaries

Every worker has its own package, Dockerfile, Compose service, and Radix
component. Multi-stage Docker builds copy only the selected installed package
into the runtime image.

- The API image has no Java or model-specific runtime.
- HTTP-based workers are small Python images.
- Gibbs and SolubilityCCS independently install Java and their own libraries.

See [Adding a model adapter](getting_started.md) for the contribution workflow.
