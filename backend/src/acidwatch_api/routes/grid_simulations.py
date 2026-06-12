from __future__ import annotations

import itertools
import logging
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

import acidwatch_api.database as db
from acidwatch_api.authentication import OptionalCurrentUser
from acidwatch_api.database import GetDB
from acidwatch_api.models import InputError
from acidwatch_api.models.datamodel import (
    Axis,
    CreateGridSimulation,
    GridSimulationResult,
    SimulationResult,
)
from acidwatch_api.models.base import BaseAdapter
from acidwatch_api.routes.models import (
    AdapterSet,
    build_adapters,
    build_model_input_rows,
    build_simulation_result,
    get_adapters,
    run_adapters,
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
    request: Request,
    session: GetDB,
    background_tasks: BackgroundTasks,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
) -> UUID:
    jwt_token = user.jwt_token if user else None

    adapters = build_adapters(create.models, create.conditions, all_adapters, jwt_token)

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

    scheduled: list[tuple[dict[str, int | float], list[BaseAdapter], list[UUID]]] = []
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

        point_adapters = build_adapters(
            create.models, create.conditions, all_adapters, jwt_token
        )
        scheduled.append(
            (
                point_concentrations,
                point_adapters,
                [row.id for row in model_input_rows],
            )
        )

    grid = db.GridSimulation(
        owner_id=UUID(user.id) if user else None,
        axes=[axis.model_dump() for axis in create.axes],
        simulation_ids=simulation_ids,
    )
    session.add(grid)
    session.commit()

    for point_concentrations, point_adapters, model_input_ids in scheduled:
        background_tasks.add_task(
            run_adapters,
            request.state.session,
            point_concentrations,
            point_adapters,
            model_input_ids,
        )

    return grid.id


@router.get("/grid-simulations/{grid_id}/result")
def get_grid_simulation_result(
    grid_id: UUID,
    session: GetDB,
) -> GridSimulationResult:
    grid = session.get_one(db.GridSimulation, grid_id)

    axes = [Axis(**a) for a in grid.axes]
    sim_uuids = [UUID(sid) for sid in grid.simulation_ids]

    simulations: list[SimulationResult] = [
        build_simulation_result(session, sim_id) for sim_id in sim_uuids
    ]

    overall_status: Literal["done", "pending"] = "done"
    if any(s.status == "pending" for s in simulations):
        overall_status = "pending"

    return GridSimulationResult(
        status=overall_status,
        axes=axes,
        simulations=simulations,
    )
