"""Integration tests for the happy-path pipeline execution: a job is
published to a model's queue, a (simulated) worker consumes it and publishes
a result, and the result listener persists it to the database -- for single
and chained models.

See ``tests/broker/integration/conftest.py`` for fixtures.
"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from acidwatch_api.app import fastapi_app
from acidwatch_api.broker.listener import result_listener
from acidwatch_messaging import RESULTS_QUEUE, job_queue_name
from acidwatch_api.settings import SETTINGS
from tests.broker.integration.conftest import (
    create_simulation_in_db,
    mock_transport,
    requires_docker,
    wait_until,
)
import acidwatch_api.database as db
from acidwatch_api.routes._helpers import build_simulation_result

pytestmark = [requires_docker, pytest.mark.asyncio]


def _fetch_result(test_sessionmaker, model_input_id):
    with test_sessionmaker() as session:
        return (
            session.query(db.ModelResult)
            .filter(db.ModelResult.model_input_id == model_input_id)
            .one_or_none()
        )


async def _await_result(test_sessionmaker, model_input_id, timeout=5.0):
    found = await wait_until(
        lambda: _fetch_result(test_sessionmaker, model_input_id) is not None,
        timeout=timeout,
    )
    if not found:
        raise AssertionError(f"No result persisted for model_input {model_input_id}")
    return _fetch_result(test_sessionmaker, model_input_id)


async def _mock_worker_once(transport, model_id, handle):
    async with asyncio.timeout(5):
        async for message in transport.messages(job_queue_name(model_id)):
            job = message.body
            await transport.publish(RESULTS_QUEUE, handle(job))
            await message.ack()
            return job
    raise AssertionError(f"No job received for {model_id}")


def _result_payload(job, concentrations=None, error=None):
    phases = []
    if concentrations is not None:
        phases = [
            {
                "kind": "co2-rich",
                "fraction": 1.0,
                "concentrations": concentrations,
            }
        ]
    return {
        "model_input_id": job["model_input_id"],
        "phases": phases,
        "panels": [],
        "error": error,
    }


async def test_three_models_run_in_chain(transport, test_sessionmaker):
    simulation = create_simulation_in_db(
        test_sessionmaker, ["model_a", "model_b", "model_c"]
    )
    first_id, second_id, third_id = (mi.id for mi in simulation.model_inputs)

    listener_task = asyncio.create_task(result_listener(transport, test_sessionmaker))
    try:
        await transport.publish(
            job_queue_name("model_a"),
            {
                "model_input_id": str(first_id),
                "model_id": "model_a",
                "concentrations": {"H2O": 100},
            },
        )

        def handle_a(job):
            return _result_payload(job, {"H2O": 50})

        def handle_b(job):
            assert job["concentrations"] == {"H2O": 50}
            return _result_payload(job, {"H2O": 25})

        def handle_c(job):
            assert job["concentrations"] == {"H2O": 25}
            return _result_payload(job, {"H2O": 12.5})

        jobs = await asyncio.gather(
            _mock_worker_once(transport, "model_a", handle_a),
            _mock_worker_once(transport, "model_b", handle_b),
            _mock_worker_once(transport, "model_c", handle_c),
        )

        assert [job["model_input_id"] for job in jobs] == [
            str(first_id),
            str(second_id),
            str(third_id),
        ]
        await asyncio.gather(
            _await_result(test_sessionmaker, first_id),
            _await_result(test_sessionmaker, second_id),
            _await_result(test_sessionmaker, third_id),
        )
        with test_sessionmaker() as session:
            result = build_simulation_result(session, simulation.id)

        assert result.status == "done"
        assert [
            model_result.phases[0].concentrations for model_result in result.results
        ] == [{"H2O": 50}, {"H2O": 25}, {"H2O": 12.5}]
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task


async def test_model_error_stops_chain_and_preserves_partial_results(
    transport, queue_depth, test_sessionmaker
):
    simulation = create_simulation_in_db(
        test_sessionmaker, ["model_a", "model_b", "model_c"]
    )
    first_id, second_id, _ = (mi.id for mi in simulation.model_inputs)

    mocked_transport, message_calls = mock_transport(transport)
    listener_task = asyncio.create_task(
        result_listener(mocked_transport, test_sessionmaker)
    )
    try:
        await transport.publish(
            job_queue_name("model_a"),
            {
                "model_input_id": str(first_id),
                "model_id": "model_a",
                "concentrations": {"H2O": 100},
            },
        )

        def handle_a(job):
            return _result_payload(job, {"H2O": 50})

        def handle_b(job):
            return _result_payload(job, error="RuntimeError: intentional failure")

        await _mock_worker_once(transport, "model_a", handle_a)
        await _mock_worker_once(transport, "model_b", handle_b)
        await _await_result(test_sessionmaker, second_id)
        assert await wait_until(lambda: message_calls.ack.await_count == 2)

        assert await queue_depth(job_queue_name("model_c")) == 0

        with test_sessionmaker() as session:
            result = build_simulation_result(session, simulation.id)

        assert result.status == "error"
        assert result.error == "RuntimeError: intentional failure"
        assert len(result.results) == 1
        assert result.results[0].phases[0].concentrations == {"H2O": 50}
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task


async def test_pipeline_completes_while_api_restarts(transport, monkeypatch, tmp_path):
    database_path = tmp_path / "api-restart.sqlite"
    monkeypatch.setattr(
        SETTINGS,
        "acidwatch_database",
        f"sqlite:///{database_path}",
    )

    with TestClient(fastapi_app) as first_api:
        sessionmaker = first_api.app_state["session"]
        simulation = create_simulation_in_db(sessionmaker, ["model_a", "model_b"])
        first_id, second_id = (mi.id for mi in simulation.model_inputs)
        await transport.publish(
            job_queue_name("model_a"),
            {
                "model_input_id": str(first_id),
                "model_id": "model_a",
                "concentrations": {"H2O": 100},
            },
        )

    listener_task = asyncio.create_task(result_listener(transport, sessionmaker))
    try:

        def handle_a(job):
            return _result_payload(job, {"H2O": 50})

        def handle_b(job):
            assert job["concentrations"] == {"H2O": 50}
            return _result_payload(job, {"H2O": 25})

        await asyncio.gather(
            _mock_worker_once(transport, "model_a", handle_a),
            _mock_worker_once(transport, "model_b", handle_b),
        )
        await _await_result(sessionmaker, second_id)

        with TestClient(fastapi_app) as restarted_api:
            response = restarted_api.get(f"/simulations/{simulation.id}/result")
            response.raise_for_status()

        assert response.json()["status"] == "done"
        assert [
            result["phases"][0]["concentrations"]
            for result in response.json()["results"]
        ] == [{"H2O": 50}, {"H2O": 25}]
    finally:
        listener_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener_task
