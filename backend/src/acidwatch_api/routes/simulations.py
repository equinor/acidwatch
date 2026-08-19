from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

import acidwatch_api.database as db
from acidwatch_api.authentication import OptionalCurrentUser
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.database import GetDB
from acidwatch_messaging import AdapterJob, Transport, job_queue_name
from acidwatch_models import AdapterSet, InputError, get_adapters
from acidwatch_models.datamodel import (
    Simulation,
    SimulationResult,
)
from acidwatch_api.routes._helpers import (
    build_adapters,
    build_model_input_rows,
    build_simulation_result,
    get_heartbeat_registry,
    get_transport,
)

router = APIRouter()


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(
    simulation_id: UUID,
    session: GetDB,
    registry: Annotated[HeartbeatRegistry, Depends(get_heartbeat_registry)],
) -> SimulationResult:
    return build_simulation_result(session, simulation_id, registry)


@router.post("/simulations")
async def run_simulation(
    create_simulation: Simulation,
    user: OptionalCurrentUser,
    session: GetDB,
    all_adapters: Annotated[AdapterSet, Depends(get_adapters)],
    transport: Annotated[Transport, Depends(get_transport)],
) -> UUID:
    adapters = build_adapters(
        create_simulation.models,
        create_simulation.conditions,
        all_adapters,
    )

    concentrations = create_simulation.concentrations
    try:
        adapters[0].validate_concentrations(concentrations)
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    model_inputs = build_model_input_rows(create_simulation.models)

    simulation = db.Simulation(
        owner_id=UUID(user.id) if user else None,
        phases=[p.model_dump() for p in create_simulation.phases],
        conditions=create_simulation.conditions.model_dump(),
        model_inputs=model_inputs,
    )
    session.add(simulation)
    session.commit()

    first_input = simulation.model_inputs[0]
    await transport.publish(
        job_queue_name(first_input.model_id),
        AdapterJob(
            model_input_id=first_input.id,
            model_id=first_input.model_id,
            concentrations=concentrations,
            parameters=first_input.parameters,
            conditions=create_simulation.conditions,
        ),
    )

    return simulation.id
