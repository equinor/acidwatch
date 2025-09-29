from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID, uuid4

from fastapi import FastAPI
from sqlalchemy import Engine, create_engine, DateTime, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class User(Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column()
    principal_name: Mapped[str] = mapped_column()


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
