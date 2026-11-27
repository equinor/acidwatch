"""The catalogue of models the API knows about.

The API has no list of its own. Each worker announces its model with every
heartbeat, and the announcements are kept in the ``models`` table. A model
that stops being announced becomes outdated and is removed.
"""

from __future__ import annotations

import asyncio
import json
import logging
import textwrap
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Annotated, Any, Callable, Literal

import nh3
from markdown import markdown
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    create_model,
)
from pydantic.alias_generators import to_camel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import acidwatch_api.database as db
from acidwatch_messaging import ModelDescriptor

logger = logging.getLogger(__name__)

# A model that has not been announced for this long is outdated
MODEL_TTL = timedelta(hours=1)
PURGE_INTERVAL = timedelta(minutes=5)

# While workers from two images announce the same model, the newest image
# wins. Once the newest image has been silent for this long it is taken to be
# gone (a rollback), and an older image may describe the model again.
SUPERSEDED_AFTER = timedelta(minutes=5)

# Heartbeats arrive far more often than the timestamps need to be exact
_TIMESTAMP_PRECISION = timedelta(minutes=1)

Catalogue = dict[str, ModelDescriptor]


def _naive_utc(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _replaces(row: db.Model, build_time: datetime | None, now: datetime) -> bool:
    """Whether an announcement from ``build_time`` may replace the stored one."""
    # Without an image there is nothing to compare: take them as they arrive.
    if build_time is None or row.build_time is None:
        return True
    if build_time >= row.build_time:
        return True
    return now - row.descriptor_seen_at > SUPERSEDED_AFTER


def record_announcement(
    session: Session, descriptor: ModelDescriptor, *, now: datetime
) -> None:
    """Add a model to the catalogue, or note that it is still around."""
    build_time = _naive_utc(descriptor.build_time)
    payload = descriptor.model_dump(mode="json", exclude={"build_time"})

    row = session.scalar(
        select(db.Model).where(db.Model.model_id == descriptor.model_id)
    )
    if row is None:
        session.add(
            db.Model(
                model_id=descriptor.model_id,
                descriptor=payload,
                build_time=build_time,
                last_seen_at=now,
                descriptor_seen_at=now,
            )
        )
        session.commit()
        return

    if _replaces(row, build_time, now):
        if row.descriptor != payload or row.build_time != build_time:
            row.descriptor = payload
            row.build_time = build_time
            row.descriptor_seen_at = now
        elif now - row.descriptor_seen_at >= _TIMESTAMP_PRECISION:
            row.descriptor_seen_at = now

    if now - row.last_seen_at >= _TIMESTAMP_PRECISION:
        row.last_seen_at = now

    if session.dirty:
        session.commit()


def load_catalogue(session: Session, *, now: datetime) -> Catalogue:
    """Every model that is not outdated, ordered by model ID."""
    rows = session.scalars(
        select(db.Model).where(db.Model.last_seen_at > now - MODEL_TTL)
    )
    descriptors: list[ModelDescriptor] = []
    for row in rows:
        try:
            descriptors.append(
                ModelDescriptor.model_validate(
                    {**row.descriptor, "build_time": row.build_time}
                )
            )
        except ValidationError:
            # Stored by another version of the API. The next heartbeat fixes it.
            logger.warning("Ignoring unreadable catalogue entry %s", row.model_id)

    descriptors.sort(key=lambda d: d.model_id)
    return {descriptor.model_id: descriptor for descriptor in descriptors}


def purge_outdated(session: Session, *, now: datetime) -> list[str]:
    """Delete outdated models and return their IDs."""
    removed = list(
        session.scalars(
            delete(db.Model)
            .where(db.Model.last_seen_at <= now - MODEL_TTL)
            .returning(db.Model.model_id)
        )
    )
    session.commit()
    return removed


async def purge_outdated_periodically(sessionmaker: db.SessionMaker) -> None:
    while True:
        try:
            with sessionmaker() as session:
                removed = purge_outdated(session, now=datetime.now())
            if removed:
                logger.info("Removed outdated models: %s", ", ".join(removed))
        except Exception:
            logger.exception("Failed to remove outdated models")
        await asyncio.sleep(PURGE_INTERVAL.total_seconds())


def get_catalogue(session: db.GetDB) -> Catalogue:
    return load_catalogue(session, now=datetime.now())


@lru_cache(maxsize=256)
def render_description(description: str) -> str:
    """Render a model's Markdown description as sanitised HTML."""
    text = textwrap.dedent(description).strip()
    return nh3.clean(markdown(text, extensions=["extra", "sane_lists"]))


_SCALAR_TYPES: dict[str, type] = {
    "integer": int,
    "number": float,
    "boolean": bool,
    "string": str,
}


def _one_of(choices: list[Any]) -> Callable[[Any], Any]:
    def check(value: Any) -> Any:
        if value not in choices:
            raise ValueError(f"must be one of: {choices}")
        return value

    return check


def _annotation(spec: dict[str, Any]) -> Any:
    choices = spec.get("choices")
    scalar = _SCALAR_TYPES.get(spec.get("type", ""))
    if scalar is None:
        # An enum is described by reference, with its members in "choices"
        return Literal.__getitem__(tuple(choices)) if choices else Any
    if choices:
        return Annotated[scalar, AfterValidator(_one_of(choices))]
    return scalar


@lru_cache(maxsize=128)
def _parameters_model(schema: str) -> type[BaseModel]:
    """A validator equivalent to the worker's parameter class.

    Built from the announced schema, so the API rejects bad input with the
    same rules and messages as the worker would, without importing its code.
    """
    fields: dict[str, Any] = {}
    for index, (name, spec) in enumerate(json.loads(schema).items()):
        annotation = _annotation(spec)
        limits: dict[str, Any] = {}
        if annotation in (int, float):
            limits = {"ge": spec.get("minimum"), "le": spec.get("maximum")}
        fields[f"parameter_{index}"] = (
            annotation,
            Field(default=spec.get("default"), alias=name, **limits),
        )
    return create_model("Parameters", __config__=ConfigDict(extra="forbid"), **fields)


def parameter_errors(
    descriptor: ModelDescriptor, parameters: dict[str, Any]
) -> dict[str, list[str]]:
    """Validation errors per parameter; empty when the input is acceptable.

    This is an early check for the user's benefit. The worker validates the
    parameters again with its own class, which remains the authority.
    """
    known = descriptor.parameters
    # Parameters are announced in camelCase, but snake_case is accepted too
    named = {
        (to_camel(name) if name not in known and to_camel(name) in known else name): (
            value
        )
        for name, value in parameters.items()
    }

    model = _parameters_model(json.dumps(known, sort_keys=True))
    try:
        model.model_validate(named)
    except ValidationError as exc:
        errors: dict[str, list[str]] = defaultdict(list)
        for error in exc.errors():
            for location in error["loc"]:
                errors[str(location)].append(error["msg"])
        return dict(errors)
    return {}
