"""RabbitMQ integration fixtures.

The session-scoped container provides a real broker for transport, listener,
redelivery, and dead-letter tests. Each test receives uniquely named durable
queues through ``rabbit_transport`` and the queues are deleted afterward.

``observing_transport`` records published payloads without replacing the real
RabbitMQ transport. ``queue_depth`` inspects broker state through a separate
test-only connection; queue inspection is intentionally absent from the
application transport contract because runtime status comes from heartbeats.
"""

from __future__ import annotations

import asyncio
import inspect
from datetime import datetime
from types import SimpleNamespace
from typing import AsyncIterator, Awaitable, Callable, Union
from unittest.mock import AsyncMock
from uuid import uuid4

import aio_pika
import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker as sessionmaker_factory
from sqlalchemy.pool import StaticPool

import acidwatch_api.database as db
from acidwatch_messaging import (
    HEARTBEATS_QUEUE,
    RESULTS_QUEUE,
    job_queue_name,
)
from acidwatch_messaging import RabbitMQTransport

try:
    from testcontainers.community.rabbitmq import RabbitMqContainer
except ImportError:  # pragma: no cover - fallback for older testcontainers
    from testcontainers.rabbitmq import RabbitMqContainer


TEST_QUEUES = [
    HEARTBEATS_QUEUE,
    RESULTS_QUEUE,
    job_queue_name("model_a"),
    job_queue_name("model_b"),
    job_queue_name("model_c"),
]


def _docker_available() -> bool:
    try:
        import docker

        docker.from_env().ping()
        return True
    except Exception:
        return False


requires_docker = pytest.mark.skipif(
    not _docker_available(), reason="Docker is required for broker integration tests"
)


async def wait_until(
    predicate: Callable[[], Union[bool, Awaitable[bool]]],
    timeout: float = 5.0,
    interval: float = 0.1,
) -> bool:
    """Poll ``predicate`` (sync or async) until it returns truthy or
    ``timeout`` seconds elapse, sleeping ``interval`` seconds between checks.

    Consolidates the ``for _ in range(50): ... await asyncio.sleep(0.1)``
    pattern that was hand-rolled at every eventually-consistent assertion
    across the broker integration tests (waiting on queue depth, registry
    state, or DB rows to reflect an async listener's work). Returns whether
    the predicate became true, so callers can still assert with their own
    failure message rather than getting a generic timeout error, e.g.:

        assert await wait_until(lambda: registry.status("model_a") == "warm")
        assert registry.status("model_a") == "warm", "<why this matters>"
    """
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while True:
        result = predicate()
        if inspect.isawaitable(result):
            result = await result
        if result:
            return True
        if loop.time() >= deadline:
            return False
        await asyncio.sleep(interval)


def mock_transport(transport, *, before_ack=None, ack_side_effect=None):
    """Observe message handling while continuing to use the real transport.

    The helper returns ``(mocked_transport, message_calls)``.

    ``mocked_transport`` has the same interface used by listeners:

    * ``publish`` is an ``AsyncMock`` wrapping the real ``transport.publish``.
      Publications reach the real broker and can also be inspected through
      ``mocked_transport.publish.await_args_list``.
    * ``messages`` consumes from the real transport and yields lightweight
      wrappers around the real messages. Their ``body`` is unchanged, and
      their ``ack`` and ``reject`` methods delegate to the real message.

    ``message_calls`` contains aggregate ``AsyncMock`` spies for ``ack`` and
    ``reject``. They are separate from ``mocked_transport`` because those
    methods belong to each dynamically yielded message, not to the transport
    interface. This lets a test assert that a listener acknowledged two
    messages with ``message_calls.ack.await_count == 2`` without retaining
    every individual message object.

    ``before_ack`` runs immediately before each acknowledgement. It is used
    when a test must inspect application state at the acknowledgement
    boundary, such as verifying that the heartbeat registry was updated
    before the message was acknowledged.

    ``ack_side_effect`` is assigned to the aggregate ``ack`` mock. Raising
    from it prevents delegation to the real message's ``ack`` method, which
    simulates a listener crash immediately before acknowledgement and leaves
    the broker message available for redelivery.

    All instrumentation is test-only. The wrapped RabbitMQ or Azure Service
    Bus implementation is not modified and requires no counters, callbacks,
    or other testing methods.
    """
    message_calls = SimpleNamespace(
        ack=AsyncMock(side_effect=ack_side_effect),
        reject=AsyncMock(),
    )
    mocked_transport = SimpleNamespace(
        publish=AsyncMock(wraps=transport.publish),
    )

    async def messages(queue_name):
        async for message in transport.messages(queue_name):

            async def ack():
                if before_ack is not None:
                    before_ack()
                await message_calls.ack()
                await message.ack()

            async def reject():
                await message_calls.reject()
                await message.reject()

            yield SimpleNamespace(
                body=message.body,
                ack=ack,
                reject=reject,
            )

    mocked_transport.messages = messages
    return mocked_transport, message_calls


@pytest.fixture(scope="module")
def rabbitmq_container():
    with RabbitMqContainer("rabbitmq:4-management") as container:
        yield container


@pytest.fixture
def broker_url(rabbitmq_container) -> str:
    return (
        f"amqp://{rabbitmq_container.username}:{rabbitmq_container.password}"
        f"@{rabbitmq_container.get_container_host_ip()}:"
        f"{rabbitmq_container.get_exposed_port(rabbitmq_container.port)}/"
    )


@pytest_asyncio.fixture
async def transport(broker_url) -> AsyncIterator[RabbitMQTransport]:
    async with RabbitMQTransport(broker_url, TEST_QUEUES) as t:
        await _purge_queues(broker_url)
        try:
            yield t
        finally:
            await _purge_queues(broker_url)


async def _purge_queues(broker_url):
    connection = await aio_pika.connect_robust(broker_url)
    try:
        channel = await connection.channel()
        for queue_name in TEST_QUEUES:
            queue = await channel.declare_queue(queue_name, passive=True)
            await queue.purge()
    finally:
        await connection.close()


@pytest_asyncio.fixture
async def queue_depth(broker_url):
    """Test-only broker introspection, deliberately kept out of
    ``RabbitMQTransport`` -- see module docstring. Opens its own short-lived
    connection per call via a passive queue declare, independent of the
    ``transport`` fixture's connection."""

    async def _get(queue_name: str) -> int:
        connection = await aio_pika.connect_robust(broker_url)
        try:
            channel = await connection.channel()
            queue = await channel.declare_queue(queue_name, durable=True, passive=True)
            return queue.declaration_result.message_count
        finally:
            await connection.close()

    return _get


@pytest.fixture
def test_sessionmaker():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    db.Base.metadata.create_all(engine)
    return sessionmaker_factory(engine, expire_on_commit=False)


def create_simulation_in_db(sessionmaker, model_ids: list[str]) -> db.Simulation:
    """Create a ``Simulation`` with a chain of pending ``ModelInput`` rows,
    one per model id, mirroring what ``POST /simulations`` persists before
    handing jobs off to workers."""
    model_inputs = []
    previous_id = None
    for model_id in model_ids:
        model_input_id = uuid4()
        model_inputs.append(
            db.ModelInput(
                id=model_input_id,
                previous_model_input_id=previous_id,
                model_id=model_id,
                parameters={},
            )
        )
        previous_id = model_input_id

    simulation = db.Simulation(
        owner_id=None,
        phases=[{"kind": "co2-rich", "fraction": 1.0, "concentrations": {"H2O": 100}}],
        conditions={"temperature": 25.0, "pressure": 10.0},
        model_inputs=model_inputs,
    )
    with sessionmaker() as session:
        session.add(simulation)
        session.commit()
        session.refresh(simulation)
        for model_input in simulation.model_inputs:
            session.refresh(model_input)
    return simulation


@pytest.fixture
def now() -> datetime:
    return datetime.now()
