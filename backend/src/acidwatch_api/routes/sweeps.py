from __future__ import annotations

import logging
from collections import defaultdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select

import acidwatch_api.database as db
from acidwatch_api.authentication import OptionalCurrentUser
from acidwatch_api.database import GetDB
from acidwatch_api.models import InputError
from acidwatch_api.models.datamodel import (
    Conditions,
    CreateSweep,
    ModelInput,
    SweepPoint,
    SweepResult,
)
from acidwatch_api.routes.models import (
    AdapterSet,
    build_adapters,
    build_model_input_rows,
    get_adapters,
    order_chain,
    run_adapters,
)

router = APIRouter()

logger = logging.getLogger(__name__)


def _summarize_point(
    ordered: list[tuple[db.ModelInput, db.ModelResult | None]],
) -> tuple[str, dict[str, int | float], str | None]:
    """Reduce a simulation's chain to a sweep point status and final output.

    The "output" of a chain is the concentrations of its last model.
    """
    if not ordered:
        return "pending", {}, None

    for _, result in ordered:
        if result is not None and result.error is not None:
            return "error", {}, result.error

    if any(result is None for _, result in ordered):
        return "pending", {}, None

    final_result = ordered[-1][1]
    assert final_result is not None
    return "done", final_result.concentrations, None


@router.post("/sweeps")
async def run_sweep(
    create_sweep: CreateSweep,
    user: OptionalCurrentUser,
    request: Request,
    session: GetDB,
    background_tasks: BackgroundTasks,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
) -> UUID:
    jwt_token = user.jwt_token if user else None

    # Validate the model chain and concentrations once up front so the caller
    # gets a synchronous 422 instead of a sweep full of failed points.
    adapters = build_adapters(
        create_sweep.models, create_sweep.conditions, all_adapters, jwt_token
    )

    if create_sweep.swept_substance not in adapters[0].valid_substances:
        raise HTTPException(
            status_code=422,
            detail={
                "sweptSubstance": [
                    f"'{create_sweep.swept_substance}' is not supported by "
                    f"the selected model"
                ]
            },
        )

    try:
        adapters[0].validate_concentrations(
            {**create_sweep.concentrations, create_sweep.swept_substance: 0}
        )
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    values = create_sweep.range.values()

    sweep = db.Sweep(
        owner_id=UUID(user.id) if user else None,
        swept_substance=create_sweep.swept_substance,
        values=values,
    )
    session.add(sweep)

    scheduled: list[tuple[dict[str, int | float], list, list[UUID]]] = []
    for index, value in enumerate(values):
        point_concentrations = {
            **create_sweep.concentrations,
            create_sweep.swept_substance: value,
        }
        model_input_rows = build_model_input_rows(create_sweep.models)
        session.add(
            db.Simulation(
                owner_id=UUID(user.id) if user else None,
                concentrations=point_concentrations,
                conditions=create_sweep.conditions.model_dump(),
                sweep=sweep,
                sweep_value_index=index,
                model_inputs=model_input_rows,
            )
        )
        point_adapters = build_adapters(
            create_sweep.models, create_sweep.conditions, all_adapters, jwt_token
        )
        scheduled.append(
            (
                point_concentrations,
                point_adapters,
                [row.id for row in model_input_rows],
            )
        )

    session.commit()

    for point_concentrations, point_adapters, model_input_ids in scheduled:
        background_tasks.add_task(
            run_adapters,
            request.state.session,
            point_concentrations,
            point_adapters,
            model_input_ids,
        )

    return sweep.id


@router.get("/sweeps/{sweep_id}/result")
def get_sweep_result(
    sweep_id: UUID,
    session: GetDB,
) -> SweepResult:
    sweep = session.get_one(db.Sweep, sweep_id)

    simulations = (
        session.execute(
            select(db.Simulation).where(db.Simulation.sweep_id == sweep_id)
        )
        .scalars()
        .all()
    )
    simulation_by_index = {sim.sweep_value_index: sim for sim in simulations}

    rows_by_simulation: dict[
        UUID, list[tuple[db.ModelInput, db.ModelResult | None]]
    ] = defaultdict(list)
    simulation_ids = [sim.id for sim in simulations]
    if simulation_ids:
        q = (
            select(db.ModelInput, db.ModelResult)
            .where(db.ModelInput.simulation_id.in_(simulation_ids))
            .outerjoin(db.ModelResult)
        )
        for model_input, result in session.execute(q):
            rows_by_simulation[model_input.simulation_id].append(
                (model_input, result)
            )

    points: list[SweepPoint] = []
    overall_pending = False
    for index, value in enumerate(sweep.values):
        simulation = simulation_by_index.get(index)
        if simulation is None:
            overall_pending = True
            continue

        ordered = order_chain(rows_by_simulation.get(simulation.id, []))
        status, concentrations, error = _summarize_point(ordered)
        if status == "pending":
            overall_pending = True

        points.append(
            SweepPoint(
                value=value,
                simulation_id=simulation.id,
                status=status,  # type: ignore[arg-type]
                error=error,
                concentrations=concentrations,
            )
        )

    first_simulation = simulation_by_index.get(0)
    if first_simulation is not None:
        models = [
            ModelInput(model_id=mi.model_id, parameters=mi.parameters)
            for mi, _ in order_chain(rows_by_simulation.get(first_simulation.id, []))
        ]
        base_concentrations = dict(first_simulation.concentrations or {})
        conditions = Conditions(**(first_simulation.conditions or {}))
    else:
        models = []
        base_concentrations = {}
        conditions = Conditions()

    return SweepResult(
        status="pending" if overall_pending else "done",
        swept_substance=sweep.swept_substance,
        values=list(sweep.values),
        concentrations=base_concentrations,
        conditions=conditions,
        models=models,
        points=points,
    )
