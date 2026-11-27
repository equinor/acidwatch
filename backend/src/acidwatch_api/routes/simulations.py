from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

import acidwatch_api.database as db
from acidwatch_api.authentication import OptionalCurrentUser
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.catalogue import Catalogue, get_catalogue
from acidwatch_api.database import GetDB
from acidwatch_messaging import AdapterJob, Transport, job_queue_name
from acidwatch_messaging.datamodel import (
    Simulation,
    SimulationResult,
)
from acidwatch_api.routes._helpers import (
    build_model_input_rows,
    build_simulation_result,
    check_concentrations,
    get_heartbeat_registry,
    get_transport,
    query_input_results,
    resolve_models,
    timeout_stalled_simulation,
)

router = APIRouter()


@router.get("/simulations/{simulation_id}/result")
def get_result_for_simulation(
    simulation_id: UUID,
    session: GetDB,
    registry: Annotated[HeartbeatRegistry, Depends(get_heartbeat_registry)],
) -> SimulationResult:
    simulation = session.get_one(db.Simulation, simulation_id)
    input_results = query_input_results(session, simulation_id)
    if timeout_stalled_simulation(session, input_results, registry, datetime.now()):
        input_results = query_input_results(session, simulation_id)
    return build_simulation_result(simulation, input_results, registry)


@router.post("/simulations")
async def run_simulation(
    create_simulation: Simulation,
    user: OptionalCurrentUser,
    session: GetDB,
    catalogue: Annotated[Catalogue, Depends(get_catalogue)],
    transport: Annotated[Transport, Depends(get_transport)],
) -> UUID:
    models = resolve_models(create_simulation.models, catalogue)

    concentrations = create_simulation.concentrations
    check_concentrations(models[0], concentrations)

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
