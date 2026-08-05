"""Integration tests for the heartbeat flow: worker -> broker -> listener ->
in-memory registry -> ``GET /models/status``.

See ``tests/broker/integration/conftest.py`` for the fixtures and the module
docstring there for the interfaces this exercises.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta

import pytest

from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.broker.listener import heartbeat_listener
from acidwatch_messaging import HEARTBEATS_QUEUE
from tests.broker.integration.conftest import (
    mock_transport,
    requires_docker,
    wait_until,
)

pytestmark = [requires_docker, pytest.mark.asyncio]


async def _publish_heartbeat(transport, model_id, instance_id, timestamp, job_id=None):
    await transport.publish(
        HEARTBEATS_QUEUE,
        {
            "model_id": model_id,
            "instance_id": instance_id,
            "timestamp": timestamp.isoformat(),
            "job_id": job_id,
        },
    )


async def test_heartbeat_listener_drains_pre_queued_backlog(transport, now):
    """Messages queued before the listener starts must all be consumed, and
    processed in order: the registry must end up reflecting the *later* of
    the two backlogged timestamps, not just "some" heartbeat having arrived.
    """
    earlier = now
    later = now + timedelta(seconds=90)
    await _publish_heartbeat(transport, "model_a", "inst-1", earlier)
    await _publish_heartbeat(transport, "model_a", "inst-1", later)

    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    listener_task = asyncio.create_task(heartbeat_listener(transport, registry))

    try:
        assert await wait_until(
            lambda: (
                registry.status("model_a", now=later + timedelta(seconds=1)) == "warm"
            )
        ), "The listener did not apply the later heartbeat from the queued backlog"
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task


async def test_heartbeat_listener_acknowledges_messages(transport, now):
    """Once processed, heartbeat messages should be ack'd and not remain on
    the queue; the registry must also reflect the update."""
    await _publish_heartbeat(transport, "model_a", "inst-1", now)

    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    statuses_at_ack = []
    mocked_transport, message_calls = mock_transport(
        transport,
        before_ack=lambda: statuses_at_ack.append(registry.status("model_a", now=now)),
    )
    listener_task = asyncio.create_task(heartbeat_listener(mocked_transport, registry))

    try:
        assert await wait_until(lambda: registry.status("model_a", now=now) == "warm")
        assert await wait_until(lambda: message_calls.ack.await_count == 1)
        assert statuses_at_ack == ["warm"]
    finally:
        if not listener_task.done():
            listener_task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await listener_task


async def test_model_transitions_to_cold_when_heartbeats_stop(transport, now):
    """Core flow-diagram scenario: worker stops publishing heartbeats (crash
    or shutdown), and after the timeout window the API reports the model cold.

    Uses a short custom timeout and advances the queried time rather than
    sleeping in real time.
    """
    short_timeout = timedelta(seconds=2)
    registry = HeartbeatRegistry(timeout=short_timeout)
    listener_task = asyncio.create_task(heartbeat_listener(transport, registry))

    try:
        await _publish_heartbeat(transport, "model_a", "inst-1", now)

        assert await wait_until(lambda: registry.status("model_a", now=now) == "warm")

        assert (
            registry.status(
                "model_a", now=now + short_timeout + timedelta(microseconds=1)
            )
            == "cold"
        ), "Model should be cold after no heartbeat for longer than the timeout"
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task
