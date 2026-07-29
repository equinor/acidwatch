---
status: {proposed}
date: {2026-07-29}
decision-makers: {CCS Data & Digital Team}
---

# Isolate model execution in broker-backed workers

## Context

AcidWatch previously installed every model dependency in the API process.
Compute-heavy libraries increased image size, introduced incompatible
dependency risk, and made model scaling inseparable from API scaling.

The API still needs each model's identifier, description, valid substances,
and typed parameters to validate requests and describe models to the frontend.
Those declarations must not be duplicated between the API and workers.

## Decision

Model metadata and parameter declarations live in the lightweight
`acidwatch-models` package. The API imports this registry but does not import
worker implementations.

Broker transports and the generic worker runtime live in
`acidwatch-messaging`. Jobs use `acidwatch.<model_id>` queues and results return
through `acidwatch.results`.

Each concrete implementation lives in `workers/<model>` with its own Python
package, dependencies, Dockerfile, and Radix component. The implementation
subclasses its shared definition, so metadata and validation remain
single-sourced.

RabbitMQ is used for local development and Azure Service Bus is used in Radix.
Redis and broker metrics are outside this decision.

## Consequences

- The API image contains no model implementation or model-specific runtime.
- Workers install only their own dependencies and scale independently.
- Adding a model requires a lightweight definition, an isolated worker package,
  a worker component, and a Service Bus queue.
- Shared result correlation currently requires one API replica.
