from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from pydantic import BaseModel
from uuid import UUID, uuid4


class InitFinalDiff(BaseModel):
    initial: Dict[str, float]
    final: Dict[str, float]
    change: Dict[str, float]


class Results(BaseModel):
    initfinaldiff: InitFinalDiff


class CommonPaths(BaseModel):
    paths: Optional[Dict[str, Optional[str]]] = Field(default_factory=dict)
    k: Optional[Dict[str, Optional[str]]] = Field(default_factory=dict)
    frequency: Optional[Dict[str, Optional[int]]] = Field(default_factory=dict)


class Stats(BaseModel):
    index: Dict[str, str]
    k: Dict[str, str]
    frequency: Dict[str, float]


class Analysis(BaseModel):
    common_paths: CommonPaths
    stats: Stats


class ChartData(BaseModel):
    comps: Dict[str, str]
    values: Dict[str, float]
    variance: Dict[str, float]
    variance_minus: Dict[str, float]


class SimulationResults(BaseModel):
    results: Results
    analysis: Optional[Analysis] = None
    chart_data: ChartData


class SimulationRequest(BaseModel):
    concs: dict[str, float] = Field(default_factory=dict)
    settings: dict[str, float] = Field(default_factory=dict)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "concs": {
                        "SO2": 10e-6,
                        "NO2": 50e-6,
                        "H2S": 30e-6,
                        "H2O": 20e-6,
                    },
                    "settings": {
                        "Temperature": 300,
                        "Pressure": 10,
                        "Samples": 10,
                    },
                }
            ]
        }
    }


class Project(BaseModel):
    id: UUID = uuid4()
    name: str = ""
    description: str = ""
    owner: str = ""
    owner_id: str = ""
    private: bool = True
    access_ids: List[str] = []
    date: str = ""


class Scenario(BaseModel):
    id: UUID = uuid4()
    project_id: str = ""
    name: str = ""
    owner: str = ""
    scenario_inputs: SimulationRequest = SimulationRequest()
    model: str = "arcs"
    date: str = ""


# TODO: define the Result model, this is what we store in db
class Result(BaseModel):
    id: UUID = uuid4()
    scenario_id: str = ""
    raw_results: str = ""
    output_concs: Optional[dict[str, float]] = Field(default_factory=dict)
    stats: Optional[dict[str, float]] = Field(default_factory=dict)
