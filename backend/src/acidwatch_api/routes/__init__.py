from __future__ import annotations

from fastapi import APIRouter

from . import models
from . import oasis
from . import sweeps

router = APIRouter()
router.include_router(models.router)
router.include_router(oasis.router)
router.include_router(sweeps.router)


__all__ = ["router"]
