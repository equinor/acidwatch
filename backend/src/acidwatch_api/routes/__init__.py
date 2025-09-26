from __future__ import annotations

from fastapi import APIRouter

from . import models

router = APIRouter()
router.include_router(models.router)


__all__ = ["router"]
