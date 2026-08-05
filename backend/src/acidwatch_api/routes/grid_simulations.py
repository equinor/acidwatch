from __future__ import annotations

import itertools
import logging
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

import acidwatch_api.database as db
from acidwatch_api.authentication import OptionalCurrentUser
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.database import GetDB
from acidwatch_messaging import AdapterJob, Transport, job_queue_name
from acidwatch_models import AdapterSet, InputError, get_adapters
from acidwatch_models.datamodel import (
    Axis,
    CreateGridSimulation,
    GridSimulationResult,
    SimulationResult,
)
from acidwatch_api.routes.models import (
    build_adapters,
    build_model_input_rows,
    build_simulation_result,
    get_heartbeat_registry,
    get_transport,
)

router = APIRouter()

logger = logging.getLogger(__name__)


def _cartesian_values(axes: list[Axis]) -> list[list[float]]:
    ranges = [axis.range.values() for axis in axes]
    return [list(point) for point in itertools.product(*ranges)]


@router.post("/grid-simulations")
async def run_grid_simulation(
    create: CreateGridSimulation,
    user: OptionalCurrentUser,
    session: GetDB,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
    transport: Annotated[Transport, Depends(get_transport)],
) -> UUID:
    adapters = build_adapters(create.models, create.conditions, all_adapters)

    for axis in create.axes:
        if axis.substance not in adapters[0].valid_substances:
            raise HTTPException(
                status_code=422,
                detail={
                    "axes": [
                        f"'{axis.substance}' is not supported by the selected model"
                    ]
                },
            )

    test_concentrations = {
        **create.concentrations,
        **{axis.substance: 0 for axis in create.axes},
    }
    try:
        adapters[0].validate_concentrations(test_concentrations)
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    grid_points = _cartesian_values(create.axes)

    scheduled: list[tuple[dict[str, int | float], db.ModelInput]] = []
    simulation_ids: list[str] = []

    for coordinates in grid_points:
        point_concentrations = {
            **create.concentrations,
            **{axis.substance: value for axis, value in zip(create.axes, coordinates)},
        }
        model_input_rows = build_model_input_rows(create.models)
        simulation = db.Simulation(
            owner_id=UUID(user.id) if user else None,
            phases=[
                {
                    "kind": "co2-rich",
                    "fraction": 1.0,
                    "concentrations": point_concentrations,
                }
            ],
            conditions=create.conditions.model_dump(),
            model_inputs=model_input_rows,
        )
        session.add(simulation)
        session.flush()
        simulation_ids.append(str(simulation.id))

        scheduled.append((point_concentrations, model_input_rows[0]))

    grid = db.GridSimulation(
        owner_id=UUID(user.id) if user else None,
        axes=[axis.model_dump() for axis in create.axes],
        simulation_ids=simulation_ids,
    )
    session.add(grid)
    session.commit()

    for point_concentrations, first_input in scheduled:
        await transport.publish(
            job_queue_name(first_input.model_id),
            AdapterJob(
                model_input_id=first_input.id,
                model_id=first_input.model_id,
                concentrations=point_concentrations,
                parameters=first_input.parameters,
                conditions=create.conditions,
            ),
        )

    return grid.id


@router.get("/grid-simulations/{grid_id}/result")
def get_grid_simulation_result(
    grid_id: UUID,
    session: GetDB,
    registry: Annotated[HeartbeatRegistry, Depends(get_heartbeat_registry)],
) -> GridSimulationResult:
    grid = session.get_one(db.GridSimulation, grid_id)

    axes = [Axis(**a) for a in grid.axes]
    sim_uuids = [UUID(sid) for sid in grid.simulation_ids]

    simulations: list[SimulationResult] = [
        build_simulation_result(session, sim_id, registry) for sim_id in sim_uuids
    ]

    overall_status: Literal["done", "pending", "processing"] = "done"
    if any(s.status == "processing" for s in simulations):
        overall_status = "processing"
    elif any(s.status == "pending" for s in simulations):
        overall_status = "pending"

    return GridSimulationResult(
        status=overall_status,
        axes=axes,
        simulations=simulations,
    )
