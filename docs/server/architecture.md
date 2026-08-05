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

acidwatch-worker-runtime
  +-- acidwatch-models
  +-- acidwatch-messaging
  +-- job consumption, adapter execution, heartbeats, acknowledgements

acidwatch-models
  +-- BaseAdapter and BaseParameters
  +-- shared request/result data models
  +-- lightweight model definitions and registry
  +-- no concrete model runtime

acidwatch-worker-<model>
  +-- acidwatch-models
  +-- acidwatch-worker-runtime
  +-- only that model's implementation and dependencies
```

The model definition and implementation are intentionally separate:

- `backend/packages/acidwatch-models/src/acidwatch_models/definitions` contains
  identifiers, descriptions, categories, valid substances, and typed
  parameters.
- `workers/<model>` contains `run()` and model-specific dependencies.

A worker implementation subclasses its definition. This keeps metadata
single-sourced while ensuring packages such as NeqSim and SolubilityCCS are not
installed in the API or unrelated workers.

## Simulation flow

1. `GET /models` reads the lightweight registry and returns model metadata,
   valid substances, and parameter schemas.
2. `POST /simulations` validates the selected model chain. The API creates one
   database `ModelInput` row per model and links them in execution order.
3. After committing the simulation, the API publishes a typed `AdapterJob` for
   the first model to `acidwatch.<model_id>`.
4. The job contains the model input ID, model ID, concentrations, conditions,
   and parameters. Worker authentication propagation is intentionally deferred.
5. The corresponding worker consumes the job with a prefetch count of one,
   validates the message, instantiates its concrete adapter, and calls `run()`.
6. The worker merges passthrough concentrations and publishes an
   `AdapterResult` containing phases, optional panels, or an explicit error.
7. The API result listener persists `ModelResult`, finds the next input through
   `previous_model_input_id`, publishes its job, and then acknowledges the
   result message.
8. The chain is complete when every model input has a persisted result. Clients
   poll the simulation result endpoint; Redis is not involved.

Grid simulations use the same flow. Each grid point is stored as an ordinary
simulation and can progress independently through its selected chain. The grid
result endpoint returns every point in axis order together with its own status,
so clients can render finished points while the remaining ones are still
running.

## Broker transports

`acidwatch-messaging` exposes the same publishing and message-stream interface
for both transports:

- RabbitMQ uses durable queues, persistent messages,
  acknowledgements, and requeue on transient delivery failures.
- Azure Service Bus is used in Radix. Each worker scales from zero based on its
  job queue while the API consumes the shared results queue.

Workers are stateless and scale independently. Model availability is held in
the API's in-memory heartbeat registry, so the deployment currently uses one
API replica.

## Delivery guarantees and known limitations

Chain orchestration state is persisted in SQL and messages are acknowledged
only after their required database and broker side effects complete.

### Initial dispatch is not transactional

The API commits a simulation before publishing its first job. A crash or broker
failure between those operations can leave a pending simulation without a job.
Lazy timeout detection eventually records an error but does not recover the
job. A transactional outbox would close this gap and is intentionally outside
the current implementation.

### Queue depth is what drives worker scaling

Each worker's KEDA trigger scales on the Service Bus **active** message count,
which excludes messages already locked by a replica. A job that is picked up
immediately is therefore invisible to the scaler, and replicas only grow when
jobs are queued faster than they are consumed.

Because a model chain is sequential, a single simulation never has more than
one job in flight and can never scale a worker past one replica. Concurrent
depth comes from grid simulations because the API publishes one first-stage
job per point. Chaining within each point remains sequential and is still
driven by persisted results in the API.

### Timeout and lock budgets

| Setting | Value | Source |
| --- | --- | --- |
| Pending model timeout | 100 min | `SETTINGS.model_input_timeout_minutes` |
| Service Bus message lock | 60 s | queue default |
| Automatic lock renewal | 7200 s | `MESSAGE_LOCK_RENEWAL_SECONDS` |
| Max delivery count | 10 | queue default |

Both worker and API receivers renew Service Bus locks while processing. The
pending timeout should remain below the renewal budget.

### At-least-once delivery

Both transports redeliver rather than drop:

- RabbitMQ requeues unacknowledged messages when a channel or connection
  closes, and the worker transport requeues on handler failure, so a
  deterministically failing job is redelivered until it is dead-lettered.
- Service Bus redelivers on lock expiry or abandonment, up to the max delivery
  count.

A model may therefore execute more than once. `ModelResult.model_input_id` is
unique and the first persisted result wins. Redelivery can republish the next
job, but its concentrations are always derived from that persisted result.

## Deployment boundaries

Every worker has its own package, Dockerfile, Compose service, and Radix
component. Multi-stage Docker builds copy only the selected installed package
into the runtime image.

- The API image has no Java or model-specific runtime.
- HTTP-based workers are small Python images.
- Gibbs and SolubilityCCS independently install Java and their own libraries.

See [Adding a model adapter](getting_started.md) for the contribution workflow.
