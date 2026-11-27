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
    result_listener,
)
from acidwatch_api.catalogue import purge_outdated_periodically
from acidwatch_api.settings import SETTINGS
from acidwatch_messaging import (
    HEARTBEATS_QUEUE,
    RESULTS_QUEUE,
    Transport,
    create_transport,
)


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
    # Job queues are not listed here: the models, and so their queues, are only
    # known once workers announce them. The transport declares a job queue
    # the first time the API publishes to it.
    queues = [HEARTBEATS_QUEUE, RESULTS_QUEUE]
    transport = create_transport(
        SETTINGS.broker_url,
        queues,
        SETTINGS.broker_transport,
    )

    try:
        async with transport:
            tasks = [
                asyncio.create_task(
                    result_listener(transport, session), name="result-listener"
                ),
                asyncio.create_task(
                    heartbeat_listener(transport, registry, session),
                    name="heartbeat-listener",
                ),
                asyncio.create_task(
                    purge_outdated_periodically(session), name="model-purge"
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
