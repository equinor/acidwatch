import pytest
from pydantic import TypeAdapter, ValidationError

from acidwatch_models.datamodel import AnyPanel, GroupPanel, JsonResult, TextResult


def test_group_round_trips_through_any_panel() -> None:
    group = GroupPanel(
        label="Results", panels=[TextResult(data="x"), JsonResult(data={"a": 1})]
    )

    stored = group.model_dump(mode="json")
    restored = TypeAdapter(AnyPanel).validate_python(stored)

    assert restored == group
    assert [panel.type for panel in restored.panels] == ["text", "json"]


def test_group_cannot_contain_a_group() -> None:
    inner = GroupPanel(panels=[TextResult(data="x")])

    with pytest.raises(ValidationError):
        GroupPanel(panels=[inner])  # type: ignore[list-item]


def test_nested_group_is_rejected_when_loading_stored_data() -> None:
    stored = {
        "type": "group",
        "panels": [{"type": "group", "panels": []}],
    }

    with pytest.raises(ValidationError):
        TypeAdapter(AnyPanel).validate_python(stored)
