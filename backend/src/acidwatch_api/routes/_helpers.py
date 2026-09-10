from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import cast
from uuid import UUID, uuid4

from fastapi import HTTPException, Request
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import acidwatch_api.database as db
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.settings import SETTINGS
from acidwatch_messaging import Transport
from acidwatch_models import (
    AdapterSet,
    BaseAdapter,
    InputError,
)
from acidwatch_models.datamodel import (
    AnyPanel,
    Conditions,
    ModelInput,
    ModelResult,
    Phase,
    Simulation,
    SimulationResult,
)

logger = logging.getLogger(__name__)


def get_transport(request: Request) -> Transport:
    return cast(Transport, request.state.transport)


def get_heartbeat_registry(request: Request) -> HeartbeatRegistry:
    return cast(HeartbeatRegistry, request.state.heartbeat_registry)


def _now() -> datetime:
    return datetime.now()


def build_adapters(
    models: list[ModelInput],
    conditions: Conditions,
    all_adapters: AdapterSet,
) -> list[BaseAdapter]:
    """Instantiate and validate the adapter chain for a set of model inputs.

    Raises:
        HTTPException: 422 if a model is unknown or its parameters are invalid.
    """
    adapters: list[BaseAdapter] = []
    for model in models:
        adapter_class = all_adapters.get(model.model_id)
        if adapter_class is None:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown model '{model.model_id}'",
            )
        try:
            adapter = adapter_class(
                parameters=model.parameters,
                conditions=conditions,
            )
            adapters.append(adapter)
        except InputError as exc:
            raise HTTPException(status_code=422, detail=exc.detail)
        except ValidationError as exc:
            detail = defaultdict(list)
            for err in exc.errors():
                for loc in err["loc"]:
                    detail[loc].append(err["msg"])

            raise HTTPException(status_code=422, detail=dict(detail))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=exc.args)
    return adapters


def build_model_input_rows(models: list[ModelInput]) -> list[db.ModelInput]:
    """Build the chained ``db.ModelInput`` rows for a simulation."""
    rows: list[db.ModelInput] = []
    previous_model_input_id: UUID | None = None
    for model in models:
        model_input_id = uuid4()
        rows.append(
            db.ModelInput(
                id=model_input_id,
                previous_model_input_id=previous_model_input_id,
                model_id=model.model_id,
                parameters=model.parameters,
            )
        )
        previous_model_input_id = model_input_id
    return rows


def order_input_results(
    input_results: list[tuple[db.ModelInput, db.ModelResult | None]],
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    """Order ``(model_input, result)`` pairs following the pipeline chain."""
    mapping: dict[UUID | None, UUID] = {}
    input_results_by_id: dict[UUID, tuple[db.ModelInput, db.ModelResult | None]] = {}
    for model_input, result in input_results:
        mapping[model_input.previous_model_input_id] = model_input.id
        input_results_by_id[model_input.id] = (model_input, result)

    ordered_input_results: list[tuple[db.ModelInput, db.ModelResult | None]] = []
    current_id: UUID | None = mapping.get(None)
    while current_id in input_results_by_id:
        assert current_id is not None
        ordered_input_results.append(input_results_by_id[current_id])
        current_id = mapping.get(current_id)
    return ordered_input_results


def query_input_results(
    session: Session, simulation_id: UUID
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    q = (
        select(db.ModelInput, db.ModelResult)
        .where(db.ModelInput.simulation_id == simulation_id)
        .outerjoin(db.ModelResult)
    )
    return [
        (model_input, model_result)
        for model_input, model_result in session.execute(q).fetchall()
    ]


def query_input_results_by_simulation(
    session: Session, simulation_ids: list[UUID]
) -> dict[UUID, list[tuple[db.ModelInput, db.ModelResult | None]]]:
    """Fetch model input/result pairs for many simulations in a single query.

    Used by the grid endpoint to avoid one query per simulation.
    """
    q = (
        select(db.ModelInput, db.ModelResult)
        .where(db.ModelInput.simulation_id.in_(simulation_ids))
        .outerjoin(db.ModelResult)
    )
    grouped: dict[UUID, list[tuple[db.ModelInput, db.ModelResult | None]]] = (
        defaultdict(list)
    )
    for model_input, result in session.execute(q).fetchall():
        grouped[model_input.simulation_id].append((model_input, result))
    return grouped


def mark_timeout(session: Session, model_input: db.ModelInput) -> None:
    """Persist a ModelResult recording that ``model_input`` timed out.

    If the listener concurrently persisted the real result first, this is a
    no-op and no timeout is logged.
    """
    result = db.ModelResult(
        model_input_id=model_input.id,
        phases=[],
        panels=[],
        error=f"Model {model_input.model_id} timed out",
    )
    session.add(result)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        return

    logger.error(
        "Simulation %s: model %s timed out",
        model_input.simulation_id,
        model_input.model_id,
    )


def timeout_stalled_simulation(
    session: Session,
    input_results: list[tuple[db.ModelInput, db.ModelResult | None]],
    registry: HeartbeatRegistry | None,
    now: datetime,
) -> bool:
    """Mark a stalled pending model_input as timed-out, if any.

    Walks the ordered chain of model_input/result pairs and, for the first
    model_input with no result, checks whether it's actively being processed
    (per ``registry``, not a database fact) or has been pending long enough
    to be considered timed out. Returns True if a result now exists for it
    that the caller doesn't have yet and should re-fetch ``input_results``
    to see - either because a timeout was recorded, or because the listener
    concurrently persisted the real result first.
    """
    previous_result_created_at: datetime | None = None

    for model_input, result in order_input_results(input_results):
        if result is not None:
            previous_result_created_at = result.created_at
            continue

        if (
            registry is not None
            and registry.job_status(str(model_input.id), now=now) == "processing"
        ):
            return False

        pending_since = previous_result_created_at or model_input.created_at
        if now - pending_since < timedelta(
            minutes=SETTINGS.model_input_timeout_minutes
        ):
            return False

        mark_timeout(session, model_input)
        return True

    return False


def _phases_to_concentrations(phases: list[Phase]) -> dict[str, int | float]:
    merged: dict[str, int | float] = {}
    for phase in phases:
        if phase.kind == "co2-rich":
            merged.update(phase.concentrations)
    return merged


def build_simulation_result(
    simulation: db.Simulation,
    input_results: list[tuple[db.ModelInput, db.ModelResult | None]],
    registry: HeartbeatRegistry | None = None,
) -> SimulationResult:
    model_inputs: list[ModelInput] = []
    results: list[ModelResult] = []
    pending = False
    processing = False
    now = _now()

    for model_input, result in order_input_results(input_results):
        model_inputs.append(
            ModelInput(
                model_id=model_input.model_id,
                parameters=model_input.parameters,
            )
        )

        if not result:
            if pending:
                continue
            pending = True
            if (
                registry is not None
                and registry.job_status(str(model_input.id), now=now) == "processing"
            ):
                processing = True
            continue

        if result.error is not None:
            logger.error("Simulation %s failed: %s", simulation.id, result.error)
            return SimulationResult(
                status="error",
                input=Simulation(
                    concentrations=_phases_to_concentrations(
                        [Phase(**p) for p in simulation.phases]
                    ),
                    conditions=Conditions(**(simulation.conditions or {})),
                    models=model_inputs,
                ),
                results=results,
                error=result.error,
            )

        results.append(
            ModelResult(
                phases=[Phase(**p) for p in result.phases],
                panels=result.panels,
            )
        )

    simulation_input = Simulation(
        concentrations=_phases_to_concentrations(
            [Phase(**p) for p in simulation.phases]
        ),
        conditions=Conditions(**(simulation.conditions or {})),
        models=model_inputs,
    )

    if pending:
        return SimulationResult(
            status="processing" if processing else "pending",
            input=simulation_input,
            results=results,
        )

    return SimulationResult(
        status="done",
        input=simulation_input,
        results=[
            ModelResult(
                phases=result.phases,
                panels=[
                    TypeAdapter(AnyPanel).validate_python(panel)
                    for panel in result.panels
                ],
            )
            for result in results
            if result is not None
        ],
    )
