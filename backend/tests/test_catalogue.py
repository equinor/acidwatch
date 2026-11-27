from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import acidwatch_api.database as db
from acidwatch_api.broker.heartbeat import HeartbeatRegistry
from acidwatch_api.broker.listener import heartbeat_listener
from acidwatch_api.catalogue import (
    MODEL_TTL,
    SUPERSEDED_AFTER,
    load_catalogue,
    purge_outdated,
    record_announcement,
)
from acidwatch_messaging import Heartbeat, ModelDescriptor

NOW = datetime(2026, 1, 1, 12, 0)
OLD_IMAGE = datetime(2025, 12, 1, tzinfo=timezone.utc)
NEW_IMAGE = datetime(2025, 12, 2, tzinfo=timezone.utc)


@pytest.fixture
def sessions():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    db.Base.metadata.create_all(engine)
    return sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
def session(sessions):
    with sessions() as session:
        yield session


def descriptor(
    display_name="Model", build_time=None, model_id="model"
) -> ModelDescriptor:
    return ModelDescriptor(
        model_id=model_id,
        display_name=display_name,
        description="",
        category="ChemicalEquilibrium",
        valid_substances=["H2O"],
        build_time=build_time,
    )


def display_names(session, now) -> list[str]:
    return [model.display_name for model in load_catalogue(session, now=now).values()]


def row_count(session) -> int:
    return session.scalar(select(func.count()).select_from(db.Model))


def test_model_is_listed_until_outdated_and_then_deleted(session):
    record_announcement(session, descriptor(), now=NOW)

    just_before = NOW + MODEL_TTL - timedelta(seconds=1)
    assert display_names(session, just_before) == ["Model"]
    assert purge_outdated(session, now=just_before) == []

    # Hidden as soon as it is outdated, even before it is deleted
    assert display_names(session, NOW + MODEL_TTL) == []
    assert row_count(session) == 1

    assert purge_outdated(session, now=NOW + MODEL_TTL) == ["model"]
    assert row_count(session) == 0


def test_models_are_ordered_by_model_id(session):
    record_announcement(session, descriptor("Alpha", model_id="b"), now=NOW)
    record_announcement(session, descriptor("Zeta", model_id="a"), now=NOW)

    assert list(load_catalogue(session, now=NOW)) == ["a", "b"]


def test_announcements_keep_a_model_alive(session):
    record_announcement(session, descriptor(), now=NOW)
    record_announcement(session, descriptor(), now=NOW + timedelta(minutes=50))

    later = NOW + timedelta(minutes=100)
    assert purge_outdated(session, now=later) == []
    assert display_names(session, later) == ["Model"]


def test_newest_image_describes_the_model_during_a_deploy(session):
    old = descriptor("Old", build_time=OLD_IMAGE)
    new = descriptor("New", build_time=NEW_IMAGE)

    record_announcement(session, old, now=NOW)
    record_announcement(session, new, now=NOW + timedelta(seconds=10))
    assert display_names(session, NOW) == ["New"]

    # Workers from the old image are still running and announcing
    record_announcement(session, old, now=NOW + timedelta(seconds=20))
    assert display_names(session, NOW) == ["New"]
    assert row_count(session) == 1


def test_older_image_takes_over_after_a_rollback(session):
    record_announcement(session, descriptor("New", build_time=NEW_IMAGE), now=NOW)

    # Only the old image is left, and the new one has been silent for a while
    later = NOW + SUPERSEDED_AFTER + timedelta(seconds=1)
    record_announcement(session, descriptor("Old", build_time=OLD_IMAGE), now=later)

    assert display_names(session, later) == ["Old"]


def test_without_build_time_announcements_apply_in_arrival_order(session):
    record_announcement(session, descriptor("First"), now=NOW)
    record_announcement(session, descriptor("Second"), now=NOW)
    assert display_names(session, NOW) == ["Second"]

    record_announcement(session, descriptor("First"), now=NOW)
    assert display_names(session, NOW) == ["First"]


class FakeMessage:
    def __init__(self, body):
        self.body = body
        self.outcome = None

    async def ack(self):
        self.outcome = "ack"

    async def reject(self):
        self.outcome = "reject"


class FakeTransport:
    def __init__(self, *messages):
        self._messages = messages

    async def messages(self, queue_name):
        for message in self._messages:
            yield message


def heartbeat(model_id: str) -> FakeMessage:
    return FakeMessage(
        Heartbeat(
            model_id=model_id,
            instance_id="worker",
            timestamp=NOW,
            descriptor=descriptor(),
        ).model_dump(mode="json")
    )


async def test_heartbeat_adds_its_model_to_the_catalogue(sessions):
    message = heartbeat("model")

    await heartbeat_listener(FakeTransport(message), HeartbeatRegistry(), sessions)

    assert message.outcome == "ack"
    with sessions() as session:
        assert list(load_catalogue(session, now=datetime.now())) == ["model"]


async def test_heartbeat_describing_another_model_is_rejected(sessions):
    message = heartbeat("someone_else")

    await heartbeat_listener(FakeTransport(message), HeartbeatRegistry(), sessions)

    assert message.outcome == "reject"
    with sessions() as session:
        assert row_count(session) == 0
