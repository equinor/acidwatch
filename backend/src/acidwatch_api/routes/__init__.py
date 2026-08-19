from __future__ import annotations

from fastapi import APIRouter

from . import grid_simulations
from . import models
from . import oasis
from . import simulations

router = APIRouter()
router.include_router(models.router)
router.include_router(simulations.router)
router.include_router(grid_simulations.router)
router.include_router(oasis.router)


__all__ = ["router"]
