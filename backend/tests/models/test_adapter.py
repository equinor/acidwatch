from typing import Annotated
from pydantic import Field, ValidationError
import pytest
from acidwatch_api.models import base


@pytest.fixture(autouse=True)
def no_adapters(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(base, "ADAPTERS", {})


def test_subclass_is_automatically_registered():
    # We have no pre-registered adapters
    assert base.ADAPTERS == {}

    class DummyAdapter(base.BaseAdapter):
        model_id = "dummy"

    # "dummy" is the only registered adapter
    assert len(base.ADAPTERS) == 1
    assert base.ADAPTERS["dummy"] is DummyAdapter
    assert base._get_parameters_type(DummyAdapter) is None


def test_parameters_class_must_contain_only_parameter_fields():
    # Pydantic handles this one
    with pytest.raises(TypeError, match="All model fields require a type annotation"):
        class Params(base.BaseParameters):
            foo = "hei"

    with pytest.raises(TypeError):
        class Params(base.BaseParameters):
            foo: str

    with pytest.raises(TypeError):
        class Params(base.BaseParameters):
            foo: str = Field("")

    with pytest.raises(TypeError):
        class Params(base.BaseParameters):
            foo: Annotated[str, Field("")]

    # OK
    class Params(base.BaseParameters):
        foo: str = base.Parameter("")

    class Params2(base.BaseParameters):
        foo: Annotated[str, base.Parameter("")]


def test_adapter_with_parameters_type():
    class Params(base.BaseParameters):
        foo: str = base.Parameter("some default")

    class DummyAdapter(base.BaseAdapter):
        model_id = "dummy"
        parameters: Params

    assert base._get_parameters_type(DummyAdapter) is Params

    adapter = DummyAdapter({}, {})
    assert adapter.parameters.foo == "some default"

    adapter = DummyAdapter({}, {"foo": "bar"})
    assert adapter.parameters.foo == "bar"


def test_adapter_with_invalid_parameters_type():
    with pytest.raises(TypeError, match="declares field 'parameters', but is not type-hinted"):
        class DummyAdapter(base.BaseAdapter):
            model_id = "dummy"
            parameters = 3

    with pytest.raises(TypeError, match="declares field 'parameters', but it's not a subclass of BaseParameters"):
        class DummyAdapter(base.BaseAdapter):
            model_id = "dummy"
            parameters: int

async def test_run():
    class DummyAdapter(base.BaseAdapter):
        model_id = "dummy"

    dummy = DummyAdapter({}, {})
    assert await dummy.user_has_access("") is True
