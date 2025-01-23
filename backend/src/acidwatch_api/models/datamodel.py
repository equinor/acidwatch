from pydantic import BaseModel, Field
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID, uuid4


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


class Result(BaseModel):
    id: UUID = uuid4()
    scenario_id: str = ""
    raw_results: str = ""
    output_concs: Optional[dict[str, float]] = Field(default_factory=dict)
    stats: Optional[dict[str, float]] = Field(default_factory=dict)
