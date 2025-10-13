import pytest
from acidwatch_api.models import base


class DummyAdapter(base.BaseAdapter):
    model_id = "dummy"
    display_name = "Dummy Model"
    description = ""
    category = "Dummy"
    valid_substances = []

    async def run(self):
        return self.concentrations


@pytest.fixture
def dummy_model(monkeypatch):
    monkeypatch.setattr(base, "ADAPTERS", {DummyAdapter.model_id: DummyAdapter})
    return DummyAdapter
