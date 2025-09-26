from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator
from uuid import UUID, uuid4

from fastapi import FastAPI
from sqlalchemy import Engine, ForeignKey, create_engine, DateTime, Uuid, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class User(Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column()
    principal_name: Mapped[str] = mapped_column()

    scenarios: Mapped[list["Scenario"]] = relationship(back_populates="owner")


class Scenario(Base):
    __tablename__ = "scenarios"

    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    model_id: Mapped[str] = mapped_column()
    model_version: Mapped[str] = mapped_column()
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSON)

    owner: Mapped[User | None] = relationship(back_populates="scenarios")
    result: Mapped[Result | None] = relationship(back_populates="scenario")


class Result(Base):
    __tablename__ = "results"

    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.id"))
    concentrations: Mapped[dict[str, float]] = mapped_column(JSON)
    panels: Mapped[list[Any]] = mapped_column(JSON)
    errors: Mapped[list[str] | None] = mapped_column(JSON)

    scenario: Mapped[Scenario] = relationship("Scenario")


DB_ENGINE: list[Engine] = [None]  # type: ignore


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    DB_ENGINE[0] = create_engine("sqlite:////tmp/test.db", echo=True)

    Base.metadata.create_all(DB_ENGINE[0])

    try:
        yield
    finally:
        pass


__all__ = ["lifespan", "User", "Base"]
