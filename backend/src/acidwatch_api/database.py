from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Any, TypeAlias, TypedDict, AsyncIterator
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, Request
from sqlalchemy import (
    Engine,
    ForeignKey,
    DateTime,
    PickleType,
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

from acidwatch_api.settings import SETTINGS

SessionMaker: TypeAlias = sessionmaker[Session]


class Base(AsyncAttrs, DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )


class Simulation(Base):
    __tablename__ = "simulations"

    owner_id: Mapped[UUID | None] = mapped_column(Uuid)
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)

    model_inputs: Mapped[list[ModelInput]] = relationship(back_populates="simulation")


class ModelInput(Base):
    __tablename__ = "model_inputs"

    simulation_id: Mapped[UUID] = mapped_column(ForeignKey("simulations.id"))
    previous_model_input_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("model_inputs.id")
    )
    model_id: Mapped[str] = mapped_column()
    parameters: Mapped[dict[str, Any]] = mapped_column(JSON)

    simulation: Mapped[Simulation] = relationship("Simulation")
    previous_model_input: Mapped[ModelInput | None] = relationship()
    result: Mapped[ModelResult | None] = relationship(back_populates="model_input")


class ModelResult(Base):
    __tablename__ = "results"

    model_input_id: Mapped[UUID] = mapped_column(ForeignKey("model_inputs.id"))
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)
    panels: Mapped[list[Any]] = mapped_column(JSON)
    python_exception: Mapped[BaseException | None] = mapped_column(PickleType)
    error: Mapped[str | None] = mapped_column()

    model_input: Mapped[ModelInput] = relationship("ModelInput")


class AppState(TypedDict):
    engine: Engine
    session: SessionMaker


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


@asynccontextmanager
async def begin_session(s: SessionMaker) -> AsyncIterator[Session]:
    with s() as session:
        try:
            yield session
            session.commit()
        except:
            session.rollback()
            raise
        finally:
            session.close()


async def get_db(request: Request) -> AsyncIterator[Session]:
    async with begin_session(request.state.session) as session:
        yield session


GetDB: TypeAlias = Annotated[Session, Depends(get_db)]
