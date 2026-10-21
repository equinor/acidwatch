import pytest
from pydantic import TypeAdapter, ValidationError

from acidwatch_models.datamodel import (
    AnyPanel,
    GroupPanel,
    StabilityDiagramResult,
    StabilityRegion,
    TextResult,
)


def _diagram(label: str) -> StabilityDiagramResult:
    return StabilityDiagramResult(
        label=label,
        regions=[
            StabilityRegion(
                name="Fe",
                points=[(0.0, 0.0), (1.0, 0.0), (1.0, 1.0)],
                centroid=(0.5, 0.3),
            )
        ],
    )


def test_group_round_trips_through_any_panel() -> None:
    group = GroupPanel(label="Maps", panels=[_diagram("N map"), TextResult(data="x")])

    stored = group.model_dump(mode="json")
    restored = TypeAdapter(AnyPanel).validate_python(stored)

    assert restored == group
    assert [panel.type for panel in restored.panels] == ["stability_diagram", "text"]


def test_group_cannot_contain_a_group() -> None:
    inner = GroupPanel(panels=[_diagram("N map")])

    with pytest.raises(ValidationError):
        GroupPanel(panels=[inner])  # type: ignore[list-item]


def test_nested_group_is_rejected_when_loading_stored_data() -> None:
    stored = {
        "type": "group",
        "panels": [{"type": "group", "panels": []}],
    }

    with pytest.raises(ValidationError):
        TypeAdapter(AnyPanel).validate_python(stored)
