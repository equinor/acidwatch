"""Integration tests for crash-recovery behaviour of the result listener.

These exercise the guarantee that a crash between persisting a result and
acknowledging the broker message does not lose data and does not corrupt
state on redelivery (the message broker will redeliver un-acked messages).
"""

from __future__ import annotations

import asyncio

import pytest

from acidwatch_api.broker.listener import result_listener
from acidwatch_messaging import DEAD_LETTER_QUEUE, RESULTS_QUEUE, job_queue_name
from tests.broker.integration.conftest import (
    create_simulation_in_db,
    mock_transport,
    requires_docker,
    wait_until,
)
import acidwatch_api.database as db

pytestmark = [requires_docker, pytest.mark.asyncio]


class SimulatedListenerCrash(RuntimeError):
    pass


async def _receive_jobs(transport, model_id, count):
    jobs = []
    async with asyncio.timeout(5):
        async for message in transport.messages(job_queue_name(model_id)):
            jobs.append(message.body)
            await message.ack()
            if len(jobs) == count:
                return jobs
    raise AssertionError(f"Expected {count} jobs for {model_id}")


async def test_listener_crash_before_ack_republishes_next_job_on_restart(
    transport, queue_depth, test_sessionmaker
):
    """A result-listener crash after publishing B but before acknowledging A
    causes A to be redelivered. On restart, A remains stored exactly once and
    the listener publishes the same B job again before acknowledging A.

    This test is large, but the main thing that is ensured in the test is that a
    message retrieved in the listener is not acknowledged to the message broker
    until both persisting result and publishing next in line is complete. A
    secondary object is to ensure that doing all of this except for acknowledge
    can be done a second time (when listener starts again) without issues.
    """
    simulation = create_simulation_in_db(test_sessionmaker, ["model_a", "model_b"])
    first_id, second_id = (mi.id for mi in simulation.model_inputs)

    payload = {
        "model_input_id": str(first_id),
        "phases": [
            {"kind": "co2-rich", "fraction": 1.0, "concentrations": {"H2O": 50}}
        ],
        "panels": [],
        "error": None,
    }
    await transport.publish(RESULTS_QUEUE, payload)

    crashing_transport, _ = mock_transport(
        transport,
        ack_side_effect=SimulatedListenerCrash(
            "Listener crashed before acknowledgement"
        ),
    )
    with pytest.raises(SimulatedListenerCrash):
        await asyncio.wait_for(
            result_listener(crashing_transport, test_sessionmaker),
            timeout=5,
        )

    with test_sessionmaker() as session:
        assert (
            session.query(db.ModelResult)
            .filter(db.ModelResult.model_input_id == first_id)
            .count()
            == 1
        )
    assert await queue_depth(job_queue_name("model_b")) == 1
    assert await wait_until(lambda: queue_depth(RESULTS_QUEUE))

    mocked_transport, message_calls = mock_transport(transport)
    listener_task = asyncio.create_task(
        result_listener(mocked_transport, test_sessionmaker)
    )
    try:
        assert await wait_until(lambda: message_calls.ack.await_count == 1), (
            "The restarted listener did not acknowledge the redelivered A result"
        )

        jobs = await _receive_jobs(transport, "model_b", count=2)
        assert [job["model_input_id"] for job in jobs] == [
            str(second_id),
            str(second_id),
        ]
        assert [job["concentrations"] for job in jobs] == [
            {"H2O": 50},
            {"H2O": 50},
        ]

        with test_sessionmaker() as session:
            first_results_count = (
                session.query(db.ModelResult)
                .filter(db.ModelResult.model_input_id == first_id)
                .count()
            )
        assert first_results_count == 1
        assert not listener_task.done()
    finally:
        if not listener_task.done():
            listener_task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await listener_task


async def test_unprocessable_result_message_is_dead_lettered(
    transport, queue_depth, test_sessionmaker
):
    """A message referencing a non-existent model_input_id must not crash the
    listener loop. Rather than looping forever or being silently dropped, the
    listener must ``.reject()`` it (a permanent, non-retryable failure), and
    RabbitMQ's broker-native dead-lettering (``RESULTS_QUEUE`` declared with
    a dead-letter-exchange argument) routes it to ``DEAD_LETTER_QUEUE`` --
    the listener itself never publishes to the dead-letter queue."""
    unknown_id = "00000000-0000-0000-0000-000000000000"
    await transport.publish(
        RESULTS_QUEUE,
        {
            "model_input_id": unknown_id,
            "phases": [],
            "panels": [],
            "error": None,
        },
    )

    mocked_transport, message_calls = mock_transport(transport)
    listener_task = asyncio.create_task(
        result_listener(mocked_transport, test_sessionmaker)
    )
    try:
        assert await wait_until(lambda: queue_depth(DEAD_LETTER_QUEUE)), (
            "Bad message was not dead-lettered"
        )

        message_calls.reject.assert_awaited_once()
        assert all(
            call.args[0] != DEAD_LETTER_QUEUE
            for call in mocked_transport.publish.await_args_list
        )
        assert not listener_task.done(), "Listener crashed on unprocessable message"
        assert await queue_depth(RESULTS_QUEUE) == 0, (
            "Bad message must not loop forever on the main queue"
        )
        assert await queue_depth(DEAD_LETTER_QUEUE) == 1, (
            "Bad message must be routed to the dead-letter queue"
        )
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task
