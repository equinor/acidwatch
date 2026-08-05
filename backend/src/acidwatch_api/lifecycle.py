from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator, TypedDict

from fastapi import FastAPI
from sqlalchemy import Engine

import acidwatch_api.database as db
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.broker.listener import (
    heartbeat_listener,
    restart_listener_on_failure,
    result_listener,
)
from acidwatch_api.settings import SETTINGS
from acidwatch_messaging import (
    HEARTBEATS_QUEUE,
    RESULTS_QUEUE,
    Transport,
    create_transport,
    job_queue_name,
)
from acidwatch_models import get_adapters


class AppState(TypedDict):
    engine: Engine
    session: db.SessionMaker
    transport: Transport
    heartbeat_registry: HeartbeatRegistry


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    if SETTINGS.broker_url is None:
        raise RuntimeError("BROKER_URL must be configured")

    engine, session = db.create_database()
    registry = HeartbeatRegistry()
    queues = [
        HEARTBEATS_QUEUE,
        RESULTS_QUEUE,
        *(job_queue_name(model_id) for model_id in get_adapters()),
    ]
    transport = create_transport(
        SETTINGS.broker_url,
        queues,
        SETTINGS.broker_transport,
    )

    try:
        async with transport:
            tasks = [
                asyncio.create_task(
                    restart_listener_on_failure(
                        "result-listener",
                        lambda: result_listener(transport, session),
                    ),
                    name="result-listener",
                ),
                asyncio.create_task(
                    restart_listener_on_failure(
                        "heartbeat-listener",
                        lambda: heartbeat_listener(transport, registry),
                    ),
                    name="heartbeat-listener",
                ),
            ]
            try:
                yield {
                    "engine": engine,
                    "session": session,
                    "transport": transport,
                    "heartbeat_registry": registry,
                }
            finally:
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
    finally:
        engine.dispose()
