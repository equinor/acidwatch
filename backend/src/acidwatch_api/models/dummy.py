from fastapi import APIRouter
from pydantic import BaseModel

from acidwatch_api import configuration

router = APIRouter()

MODEL = configuration.MODEL_TYPE.DUMMY


class Concentrations(BaseModel):
    h2o: float
    o2: float
    so2: float
    no2: float
    h2s: float
    no: float
    h2so4: float
    hno3: float


class DummyResult(BaseModel):
    initial: Concentrations
    final: Concentrations
    change: Concentrations


@router.post("/runs")
def post_dummy_run(
    concentrations: Concentrations,
) -> DummyResult:
    return DummyResult(
        initial=concentrations,
        final=Concentrations(
            h2o=concentrations.h2o + 1,
            o2=concentrations.o2 + 2,
            so2=concentrations.so2 + 3,
            no2=concentrations.no2 + 4,
            h2s=concentrations.h2s + 5,
            no=concentrations.no + 6,
            h2so4=concentrations.h2so4 + 7,
            hno3=concentrations.hno3 + 8,
        ),
        change=Concentrations(h2o=1, o2=2, so2=3, no2=4, h2s=5, no=6, h2so4=7, hno3=8),
    )
