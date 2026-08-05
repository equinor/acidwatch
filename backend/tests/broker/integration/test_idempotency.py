"""Integration tests for idempotency guarantees across the broker-driven
pipeline: duplicate messages (redelivered or accidentally published twice)
must never corrupt state or duplicate side effects.
"""

from __future__ import annotations

import asyncio

import pytest

from acidwatch_api.broker.listener import result_listener
from acidwatch_messaging import RESULTS_QUEUE, job_queue_name
from tests.broker.integration.conftest import (
    create_simulation_in_db,
    mock_transport,
    requires_docker,
    wait_until,
)
import acidwatch_api.database as db

pytestmark = [requires_docker, pytest.mark.asyncio]


async def test_duplicate_result_message_is_ignored(transport, test_sessionmaker):
    """Publishes a result, waits for it to be persisted, then publishes a
    second, distinguishable result for the same model_input_id (simulating a
    duplicate/redelivered message, or a duplicate job dispatch that produced
    real output). The listener must survive the resulting IntegrityError
    without crashing, and the row on disk must still match the *first*
    result -- using different payloads (rather than an identical repeat)
    means a bug that let the second result silently overwrite the first
    would actually be caught."""
    simulation = create_simulation_in_db(
        test_sessionmaker,
        ["model_a", "model_b"],
    )
    first_input = next(
        model_input
        for model_input in simulation.model_inputs
        if model_input.previous_model_input_id is None
    )
    model_input_id = first_input.id

    first_payload = {
        "model_input_id": str(model_input_id),
        "phases": [
            {"kind": "co2-rich", "fraction": 1.0, "concentrations": {"H2O": 50}}
        ],
        "panels": [],
        "error": None,
    }
    second_payload = {
        "model_input_id": str(model_input_id),
        "phases": [
            {"kind": "co2-rich", "fraction": 1.0, "concentrations": {"H2O": 99}}
        ],
        "panels": [],
        "error": None,
    }

    def _fetch_result():
        with test_sessionmaker() as session:
            return (
                session.query(db.ModelResult)
                .filter(db.ModelResult.model_input_id == model_input_id)
                .one_or_none()
            )

    mocked_transport, message_calls = mock_transport(transport)
    listener_task = asyncio.create_task(
        result_listener(mocked_transport, test_sessionmaker)
    )
    try:
        await transport.publish(RESULTS_QUEUE, first_payload)
        assert await wait_until(lambda: _fetch_result() is not None), (
            "First result was never persisted"
        )

        await transport.publish(RESULTS_QUEUE, second_payload)
        assert await wait_until(lambda: message_calls.ack.await_count == 2), (
            "The listener did not acknowledge both result messages"
        )

        assert not listener_task.done(), (
            "Listener must survive the second result's IntegrityError, not crash on it"
        )

        result = _fetch_result()
        assert result.phases[0]["concentrations"] == {"H2O": 50}, (
            "The first result to land must win -- the second, conflicting "
            "result must be discarded, not overwrite it"
        )

        dispatched_concentrations = []
        async with asyncio.timeout(5):
            async for message in transport.messages(job_queue_name("model_b")):
                dispatched_concentrations.append(message.body["concentrations"])
                await message.ack()
                if len(dispatched_concentrations) == 2:
                    break
        assert dispatched_concentrations == [{"H2O": 50}, {"H2O": 50}]
    finally:
        if not listener_task.done():
            listener_task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await listener_task
