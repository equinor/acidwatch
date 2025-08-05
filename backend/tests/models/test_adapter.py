from typing import Annotated
from pydantic import Field
import pytest
from acidwatch_api.models import base


def test_parameters_class_must_contain_only_parameter_fields():
    # Pydantic handles this one
    with pytest.raises(TypeError, match="All model fields require a type annotation"):

        class BadParams1(base.BaseParameters):
            foo = "hei"

    with pytest.raises(TypeError, match="must be defined using acidwatch.Parameter"):

        class BadParams2(base.BaseParameters):
            foo: str

    with pytest.raises(TypeError, match="must be defined using acidwatch.Parameter"):

        class BadParams3(base.BaseParameters):
            foo: str = Field("")

    with pytest.raises(TypeError, match="must be defined using acidwatch.Parameter"):

        class BadParams4(base.BaseParameters):
            foo: Annotated[str, Field("")]

    class GoodParams1(base.BaseParameters):
        foo: str = base.Parameter("")

    class GoodParams2(base.BaseParameters):
        foo: Annotated[str, base.Parameter("")]


def test_adapter_with_parameters_type():
    class Params(base.BaseParameters):
        foo: str = base.Parameter("some default")

    class DummyAdapter(base.BaseAdapter):
        model_id = "dummy"
        parameters: Params

    assert base._get_parameters_type(DummyAdapter) is Params

    adapter = DummyAdapter({}, {}, None)
    assert adapter.parameters.foo == "some default"

    adapter = DummyAdapter({}, {"foo": "bar"}, None)
    assert adapter.parameters.foo == "bar"


def test_adapter_with_invalid_parameters_type():
    with pytest.raises(
        TypeError, match="declares field 'parameters', but is not type-hinted"
    ):

        class DummyAdapter(base.BaseAdapter):
            model_id = "dummy"
            parameters = 3

    with pytest.raises(
        TypeError,
        match="declares field 'parameters', but it's not a subclass of BaseParameters",
    ):

        class DummyAdapter(base.BaseAdapter):
            model_id = "dummy"
            parameters: int
