from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4
from sqlalchemy import ARRAY, JSON, DateTime, Float, ForeignKey, String, Uuid, create_engine, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class User(Base):
    __tablename__ = "users"


class Project(Base):
    __tablename__ = "projects"

    scenario: Mapped[Scenario] = relationship("Scenario", uselist=False, back_populates="project")


class Scenario(Base):
    __tablename__ = "scenarios"

    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"))
    project: Mapped[Project] = relationship("Project", back_populates="scenario")
    result: Mapped[Result | None] = relationship("Result", uselist=False, back_populates="scenario")

    name: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String)


class Result(Base):
    __tablename__ = "results"

    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.id"))
    scenario: Mapped[Scenario] = relationship("Scenario", back_populates="result")
    data: Mapped[Any] = mapped_column(JSON)

engine = create_engine("sqlite://", echo=True)
Base.metadata.create_all(engine)

with Session(engine) as session:
    user = User()
    session.add(user)
    session.commit()

    project = Project()
    scenario = Scenario(project=project)

    result = Result(data={"H2O": 0, "O2": 1}, scenario=scenario)
    result2 = Result(data={"H2O": 2, "O2": 3}, scenario=scenario)
    session.add_all([project, result, result2])
    session.commit()

    breakpoint()
