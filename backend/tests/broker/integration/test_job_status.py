"""Integration tests for reporting job-in-progress status via the heartbeat
payload, per the issue's proposal to avoid peeking at queue contents:
workers include the ``job_id`` they're currently processing in their regular
heartbeat message.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta

import pytest

from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.broker.listener import heartbeat_listener
from acidwatch_messaging import HEARTBEATS_QUEUE
from tests.broker.integration.conftest import requires_docker, wait_until

pytestmark = [requires_docker, pytest.mark.asyncio]


async def _publish_heartbeat(transport, model_id, instance_id, timestamp, job_id):
    await transport.publish(
        HEARTBEATS_QUEUE,
        {
            "model_id": model_id,
            "instance_id": instance_id,
            "timestamp": timestamp.isoformat(),
            "job_id": job_id,
        },
    )


async def test_job_status_is_processing_while_worker_reports_it(transport, now):
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    listener_task = asyncio.create_task(heartbeat_listener(transport, registry))

    try:
        await _publish_heartbeat(transport, "model_a", "inst-1", now, "job-123")

        assert await wait_until(
            lambda: registry.job_status("job-123", now=now) == "processing"
        )
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task


async def test_job_status_moves_to_unknown_once_worker_reports_a_different_job(
    transport, now
):
    """When a worker finishes a job and picks up the next one, its next
    heartbeat references the new job id; the old job must no longer be
    reported as processing."""
    registry = HeartbeatRegistry(timeout=timedelta(seconds=60))
    listener_task = asyncio.create_task(heartbeat_listener(transport, registry))

    try:
        await _publish_heartbeat(transport, "model_a", "inst-1", now, "job-123")

        assert await wait_until(
            lambda: registry.job_status("job-123", now=now) == "processing"
        )

        later = now + timedelta(seconds=5)
        await _publish_heartbeat(transport, "model_a", "inst-1", later, "job-456")

        assert await wait_until(
            lambda: registry.job_status("job-456", now=later) == "processing"
        )
        assert registry.job_status("job-123", now=later) == "unknown"
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task
