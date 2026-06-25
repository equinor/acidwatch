from typing import Annotated
from pydantic import Field
from pydantic import PydanticUserError
import pytest
from acidwatch_api.models import base


def test_parameters_class_must_contain_only_parameter_fields():
    with pytest.raises(PydanticUserError, match="require a type annotation"):

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

    adapter = DummyAdapter(parameters={}, jwt_token=None)
    assert adapter.parameters.foo == "some default"

    adapter = DummyAdapter(parameters={"foo": "bar"}, jwt_token=None)
    assert adapter.parameters.foo == "bar"


def test_adapter_with_invalid_parameters_type():
    with pytest.raises(
        TypeError, match="declares field 'parameters', but is not type-hinted"
    ):

        class DummyAdapter(base.BaseAdapter):
            model_id = "dummy"
            parameters = 3


def test_adapter_description_is_rendered_to_html_once():
    class MarkdownAdapter(base.BaseAdapter):
        model_id = "markdown_dummy"
        display_name = "Markdown Dummy"
        description = "# Title\n\nSome **markdown** body."
        category = "ChemicalEquilibrium"
        valid_substances = ["H2O"]

        async def run(self):
            raise NotImplementedError()

    assert MarkdownAdapter.description_as_html() == (
        "<h1>Title</h1>\n<p>Some <strong>markdown</strong> body.</p>"
    )
