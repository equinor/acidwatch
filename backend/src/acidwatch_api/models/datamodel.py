from pydantic import BaseModel, Field

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
                    }
                }
            ]
        }
    }