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


def order_chain(
    rows: list[tuple[db.ModelInput, db.ModelResult | None]],
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    """Order ``(model_input, result)`` rows following the pipeline chain."""
    mapping: dict[UUID | None, UUID] = {}
    rows_by_id: dict[UUID, tuple[db.ModelInput, db.ModelResult | None]] = {}
    for model_input, result in rows:
        mapping[model_input.previous_model_input_id] = model_input.id
        rows_by_id[model_input.id] = (model_input, result)

    ordered: list[tuple[db.ModelInput, db.ModelResult | None]] = []
    current_id: UUID | None = mapping.get(None)
    while current_id in rows_by_id:
        assert current_id is not None
        ordered.append(rows_by_id[current_id])
        current_id = mapping.get(current_id)
    return ordered


def query_chain_rows(
    session: Session, simulation_id: UUID
) -> list[tuple[db.ModelInput, db.ModelResult | None]]:
    q = (
        select(db.ModelInput, db.ModelResult)
        .where(db.ModelInput.simulation_id == simulation_id)
        .outerjoin(db.ModelResult)
    )
    return [(row[0], row[1]) for row in session.execute(q).fetchall()]


def query_chain_rows_by_simulation(
    session: Session, simulation_ids: list[UUID]
) -> dict[UUID, list[tuple[db.ModelInput, db.ModelResult | None]]]:
    """Fetch chain rows for many simulations in a single query.

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


def _phases_to_concentrations(phases: list[Phase]) -> dict[str, int | float]:
    merged: dict[str, int | float] = {}
    for phase in phases:
        if phase.kind == "co2-rich":
            merged.update(phase.concentrations)
    return merged


def build_simulation_result(
    session: Session,
    simulation_id: UUID,
    registry: HeartbeatRegistry | None = None,
    *,
    chain_rows: list[tuple[db.ModelInput, db.ModelResult | None]] | None = None,
) -> SimulationResult:
    db_simulation = session.get_one(db.Simulation, simulation_id)

    model_inputs: list[ModelInput] = []
    results: list[ModelResult] = []
    pending = False
    processing = False
    now = _now()
    previous_result_created_at: datetime | None = None

    if chain_rows is None:
        chain_rows = query_chain_rows(session, simulation_id)

    for model_input, result in order_chain(chain_rows):
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
            pending_since = previous_result_created_at or model_input.created_at
            if now - pending_since >= timedelta(
                minutes=SETTINGS.model_input_timeout_minutes
            ):
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
                    result = session.scalar(
                        select(db.ModelResult).where(
                            db.ModelResult.model_input_id == model_input.id
                        )
                    )
                assert result is not None
                logger.error(
                    "Simulation %s failed: %s",
                    simulation_id,
                    result.error,
                )
                return SimulationResult(
                    status="error",
                    input=Simulation(
                        concentrations=_phases_to_concentrations(
                            [Phase(**p) for p in db_simulation.phases]
                        ),
                        conditions=Conditions(**(db_simulation.conditions or {})),
                        models=model_inputs,
                    ),
                    results=results,
                    error=result.error,
                )
            continue

        previous_result_created_at = result.created_at
        if result.error is not None:
            logger.error("Simulation %s failed: %s", simulation_id, result.error)
            return SimulationResult(
                status="error",
                input=Simulation(
                    concentrations=_phases_to_concentrations(
                        [Phase(**p) for p in db_simulation.phases]
                    ),
                    conditions=Conditions(**(db_simulation.conditions or {})),
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
            [Phase(**p) for p in db_simulation.phases]
        ),
        conditions=Conditions(**(db_simulation.conditions or {})),
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
