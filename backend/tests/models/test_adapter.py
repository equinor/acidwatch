import pytest
from acidwatch_api.models import base


@pytest.fixture(autouse=True)
def no_adapters(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(base, "ADAPTERS", [])


def test_subclass_is_automatically_registered():
    # We have no pre-registered adapters
    assert base.ADAPTERS == []

    class DummyAdapter(base.BaseAdapter):
        pass

    # "dummy" is the only registered adapter
    [dummy] = base.ADAPTERS
    assert isinstance(dummy, DummyAdapter)


async def test_run():
    class DummyAdapter(base.BaseAdapter):
        async def __call__(
            self,
            concs: base.Concs,
            settings: base.Settings,
        ) -> tuple[base.Concs, base.Metadata]:
            return {}, {}

    dummy = DummyAdapter()
    assert await dummy.user_has_access("") is True
