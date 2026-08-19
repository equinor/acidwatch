from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_models import (
    AdapterSet,
    get_adapters,
    get_parameters_schema,
)
from acidwatch_models.datamodel import ModelInfo
from acidwatch_api.routes import _helpers
from acidwatch_api.routes._helpers import (
    get_heartbeat_registry,
)

router = APIRouter()


@router.get("/models")
def get_models(
    adapters: Annotated[AdapterSet, Depends(get_adapters)],
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in adapters.values():
        models.append(
            ModelInfo(
                access_error=None,
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                category=adapter.category,
                description=adapter.description,
                description_html=adapter.description_as_html(),
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return models


@router.get("/models/status")
def get_models_status(
    adapters: Annotated[AdapterSet, Depends(get_adapters)],
    registry: Annotated[HeartbeatRegistry, Depends(get_heartbeat_registry)],
) -> dict[str, dict[str, str]]:
    now = _helpers._now()
    return {
        model_id: {"status": registry.status(model_id, now=now)}
        for model_id in adapters
    }
