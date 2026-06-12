from __future__ import annotations

from fastapi import APIRouter

from . import models
from . import oasis
from . import grid_simulations

router = APIRouter()
router.include_router(models.router)
router.include_router(oasis.router)
router.include_router(grid_simulations.router)


__all__ = ["router"]
