from __future__ import annotations
from datetime import datetime
from typing import Any, Iterable
from uuid import UUID, uuid4
from sqlalchemy import (
    ARRAY,
    JSON,
    DateTime,
    Float,
    ForeignKey,
    PickleType,
    String,
    Uuid,
    create_engine,
    select,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship
import pandas as pd


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        onupdate=datetime.now, default=datetime.now
    )


class Project(Base):
    __tablename__ = "projects"

    access_ids: Mapped[list[ProjectAccess]] = relationship(
        "ProjectAccess", back_populates="project"
    )
    owner_id: Mapped[str] = mapped_column()
    owner: Mapped[str] = mapped_column()
    name: Mapped[str] = mapped_column()
    description: Mapped[str] = mapped_column()
    private: Mapped[bool] = mapped_column()

    scenarios: Mapped[Scenario] = relationship(
        "Scenario", back_populates="project", cascade="all, delete-orphan"
    )
    project_accesses: Mapped[ProjectAccess] = relationship(
        "ProjectAccess", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectAccess(Base):
    __tablename__ = "project_accesses"

    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"))
    project: Mapped[Project] = relationship("Project", back_populates="access_ids")
    access_id: Mapped[str] = mapped_column()


class Scenario(Base):
    __tablename__ = "scenarios"

    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"))
    project: Mapped[Project] = relationship("Project", back_populates="scenarios")
    user: Mapped[str] = mapped_column()
    user_name: Mapped[str] = mapped_column()

    results: Mapped[list[Result]] = relationship("Result", back_populates="scenario")


class Result(Base):
    __tablename__ = "results"

    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.id"))
    scenario: Mapped[Scenario] = relationship("Scenario", back_populates="results")
    result: Mapped[pd.DataFrame] = mapped_column(PickleType)
    panels: Mapped[list[Any]] = mapped_column(JSON)


ENGINE = create_engine("sqlite:///test.db", echo=True)
Base.metadata.create_all(ENGINE, checkfirst=True)


def get_db() -> Iterable[Session]:
    db = Session(ENGINE)
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
