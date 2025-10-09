from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, TypedDict, AsyncIterator
from uuid import UUID, uuid4

from fastapi import FastAPI
from sqlalchemy import (
    Engine,
    ForeignKey,
    DateTime,
    Uuid,
    JSON,
    create_engine,
    StaticPool,
    make_url,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
    Session,
)
from sqlalchemy.ext.asyncio import AsyncAttrs

from acidwatch_api.configuration import SETTINGS


class Base(AsyncAttrs, DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )


class Scenario(Base):
    __tablename__ = "scenarios"

    owner_id: Mapped[UUID | None] = mapped_column(Uuid)
    model_id: Mapped[str] = mapped_column()
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSON)

    result: Mapped[Result | None] = relationship(back_populates="scenario")


class Result(Base):
    __tablename__ = "results"

    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.id"))
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)
    panels: Mapped[list[Any]] = mapped_column(JSON)
    errors: Mapped[list[str] | None] = mapped_column(JSON)

    scenario: Mapped[Scenario] = relationship("Scenario")


class AppState(TypedDict):
    engine: Engine
    session: sessionmaker[Session]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
    engine_kwargs: dict[str, Any] = {}

    # This is required for in-memory SQLite databases. Otherwise each thread
    # will create a new in-memory database and everything will be weird.
    url = make_url(SETTINGS.acidwatch_database)
    if url.drivername == "sqlite" and url.database in (None, "", ":memory:"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(
        SETTINGS.acidwatch_database,
        echo=not SETTINGS.is_production,
        **engine_kwargs,
    )

    if engine.name == "sqlite":
        # If we're using SQLite, create all tables at startup
        # For other databases, use alembic migrations
        Base.metadata.create_all(engine)

    session = sessionmaker(engine, expire_on_commit=False)
    state: AppState = {
        "engine": engine,
        "session": session,
    }

    try:
        yield state
    finally:
        engine.dispose()
