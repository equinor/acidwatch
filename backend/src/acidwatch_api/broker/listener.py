from __future__ import annotations

import logging

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

import acidwatch_api.database as db
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_messaging import (
    AdapterJob,
    AdapterResult,
    HEARTBEATS_QUEUE,
    Heartbeat,
    RESULTS_QUEUE,
    Transport,
    job_queue_name,
)
from acidwatch_models.datamodel import Conditions, Phase

logger = logging.getLogger(__name__)


def _concentrations(phases: list[Phase]) -> dict[str, int | float]:
    concentrations: dict[str, int | float] = {}
    for phase in phases:
        if phase.kind == "co2-rich":
            concentrations.update(phase.concentrations)
    return concentrations


def _get_or_create_model_result(
    session: Session,
    adapter_result: AdapterResult,
) -> db.ModelResult:
    model_result = session.scalar(
        select(db.ModelResult).where(
            db.ModelResult.model_input_id == adapter_result.model_input_id
        )
    )
    if model_result is not None:
        return model_result

    model_result = db.ModelResult(
        model_input_id=adapter_result.model_input_id,
        phases=[phase.model_dump() for phase in adapter_result.phases],
        panels=[
            panel.model_dump(mode="json", by_alias=True)
            for panel in adapter_result.panels
        ],
        error=adapter_result.error,
    )
    session.add(model_result)
    session.commit()
    return model_result


def _build_next_job(
    session: Session,
    model_result: db.ModelResult,
) -> AdapterJob | None:
    if model_result.error is not None:
        return None

    next_model_input = session.scalar(
        select(db.ModelInput).where(
            db.ModelInput.previous_model_input_id == model_result.model_input_id
        )
    )
    if next_model_input is None:
        return None

    persisted_phases = [Phase.model_validate(phase) for phase in model_result.phases]
    return AdapterJob(
        model_input_id=next_model_input.id,
        model_id=next_model_input.model_id,
        concentrations=_concentrations(persisted_phases),
        parameters=next_model_input.parameters,
        conditions=Conditions(**(next_model_input.simulation.conditions or {})),
    )


def _process_adapter_result(
    sessionmaker: db.SessionMaker,
    adapter_result: AdapterResult,
) -> AdapterJob | None:
    with sessionmaker() as session:
        session.get_one(db.ModelInput, adapter_result.model_input_id)
        model_result = _get_or_create_model_result(session, adapter_result)
        return _build_next_job(session, model_result)


async def heartbeat_listener(transport: Transport, registry: HeartbeatRegistry) -> None:
    async for message in transport.messages(HEARTBEATS_QUEUE):
        try:
            heartbeat = Heartbeat.model_validate(message.body)
        except ValidationError:
            await message.reject()
            continue
        registry.update(
            heartbeat.model_id,
            instance_id=heartbeat.instance_id,
            timestamp=heartbeat.timestamp,
            job_id=heartbeat.job_id,
        )
        await message.ack()


async def result_listener(transport: Transport, sessionmaker: db.SessionMaker) -> None:
    async for message in transport.messages(RESULTS_QUEUE):
        try:
            adapter_result = AdapterResult.model_validate(message.body)
        except ValidationError:
            await message.reject()
            continue

        try:
            next_job = _process_adapter_result(sessionmaker, adapter_result)
        except NoResultFound:
            logger.warning(
                "Rejecting result for missing model_input %s",
                adapter_result.model_input_id,
            )
            await message.reject()
            continue

        if next_job is not None:
            await transport.publish(job_queue_name(next_job.model_id), next_job)
        await message.ack()
