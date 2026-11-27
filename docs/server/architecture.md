# Architecture

AcidWatch separates the user-facing application, orchestration, model
definitions, and model execution. The API does not install or import model
implementations, and it has no built-in list of models: it learns what each
model accepts from the model's own worker.

## Deployed components

```text
Browser
  |
  | HTTPS: pages and /api (same origin)
  v
AcidWatch web (API + frontend) ----------------> SQL database
                           |
                           | AdapterJob
                           v
                  AMQP message broker
                    |             ^
     acidwatch.<model_id>         | acidwatch.results
                    v             | acidwatch.heartbeats
                 Model worker ----+
                    |
                    +----> Python model library or external model API
```

| Component | Responsibility |
| --- | --- |
| Frontend | Presents models and simulation results. It is built into the API image and served by the API, so the browser talks to a single origin and no CORS is involved. It has no model-specific integration logic. |
| API | Serves the frontend and, under `/api`, authenticates users, validates model inputs, creates simulation records, orchestrates model chains, publishes jobs, consumes results, and persists results. |
| SQL database | Stores simulations, ordered model inputs, model results, grid simulations, ownership, status inferred from persisted results, and the catalogue of announced models. |
| Message broker | Provides durable per-model job queues, the shared result queue and the heartbeat queue. RabbitMQ is used by local Compose; Azure Service Bus is used in Radix. |
| Model worker | Announces its model, consumes one model queue, executes one concrete adapter implementation, and returns a typed result through the broker. |

In development the Vite dev server serves the frontend and proxies `/api` to
the API, which gives the same single origin as in production.

## Python package dependencies

```text
acidwatch-api
  +-- acidwatch-messaging
  +-- FastAPI, SQLAlchemy, authentication, telemetry

acidwatch-messaging
  +-- shared request/result data models
  +-- broker contracts, including the model descriptor
  +-- aio-pika
  +-- azure-servicebus

acidwatch-worker-runtime
  +-- acidwatch-messaging
  +-- BaseAdapter and BaseParameters
  +-- job consumption, adapter execution, heartbeats, acknowledgements

acidwatch-worker-<model>
  +-- acidwatch-worker-runtime
  +-- that model's definition, implementation and dependencies
```

Each worker package holds both halves of its model:

- `workers/<model>/src/.../definition.py` contains the identifier,
  description, category, valid substances, concentration limits and typed
  parameters. It only depends on the worker runtime.
- `workers/<model>/src/.../adapter.py` subclasses the definition, adds
  `run()` and uses the model-specific dependencies.

Packages such as NeqSim and SolubilityCCS are therefore not installed in the
API or in unrelated workers.

## Model catalogue

The API keeps the models it knows about in the `models` table:

1. A worker sends a heartbeat every 30 seconds. Each heartbeat carries the
   model's descriptor, built from its definition.
2. The API stores the descriptor and notes when the model was last seen.
3. `GET /api/models` lists the stored models, and requests are validated
   against the stored descriptor. The worker validates parameters again with
   its own class, which remains the authority.
4. A model that has not been announced for one hour is outdated. It is hidden
   at once and deleted shortly after by a periodic task. Simulations refer to
   models by a plain identifier, so old simulations are unaffected.

While old and new workers run side by side during a deploy, the descriptor
from the newest image wins. Every worker image records its build time, and the
API ignores a descriptor from an older image for as long as a newer one is
still being announced. If the newer image has been silent for five minutes it
is taken to be gone, which lets a rollback take effect. Workers that do not
run from an image, as in local development, have no build time, and their
descriptors are applied in the order they arrive.

A model is only known once one of its workers has run, so every worker keeps
at least one replica in each environment.

## Simulation flow

1. `GET /api/models` reads the model catalogue and returns model metadata,
   valid substances, and parameter schemas.
2. `POST /api/simulations` validates the selected model chain. The API creates
   one database `ModelInput` row per model and links them in execution order.
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
- Azure Service Bus is used in Radix. Each worker scales on its job queue
  while the API consumes the shared results queue.

Workers are stateless and scale independently. Which workers are alive right
now ("warm" or "cold") is held in the API's in-memory heartbeat registry, so
the deployment currently uses one API replica.

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

- The API image contains the built frontend, but no Java or model-specific
  runtime.
- HTTP-based workers are small Python images.
- Gibbs and SolubilityCCS independently install Java and their own libraries.

See [Adding a model adapter](getting_started.md) for the contribution workflow.
