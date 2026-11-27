from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.catalogue import Catalogue, get_catalogue, render_description
from acidwatch_messaging.datamodel import ModelInfo
from acidwatch_api.routes import _helpers
from acidwatch_api.routes._helpers import (
    get_heartbeat_registry,
)

router = APIRouter()


@router.get("/models")
def get_models(
    catalogue: Annotated[Catalogue, Depends(get_catalogue)],
) -> list[ModelInfo]:
    return [
        ModelInfo(
            access_error=None,
            model_id=model.model_id,
            display_name=model.display_name,
            category=model.category,
            description=model.description,
            description_html=render_description(model.description),
            valid_substances=model.valid_substances,
            parameters=model.parameters,
        )
        for model in catalogue.values()
    ]


@router.get("/models/status")
def get_models_status(
    catalogue: Annotated[Catalogue, Depends(get_catalogue)],
    registry: Annotated[HeartbeatRegistry, Depends(get_heartbeat_registry)],
) -> dict[str, dict[str, str]]:
    now = _helpers._now()
    return {
        model_id: {"status": registry.status(model_id, now=now)}
        for model_id in catalogue
    }
