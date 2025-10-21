from __future__ import annotations

from fastapi import APIRouter

from . import models
from . import oasis

router = APIRouter()
router.include_router(models.router)
router.include_router(oasis.router)


__all__ = ["router"]
