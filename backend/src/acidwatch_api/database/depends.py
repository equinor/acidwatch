from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Annotated, Any, TypeAlias
from uuid import UUID

from acidwatch_api.authentication import DecodedJwtToken, get_jwt_token
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from starlette.status import HTTP_401_UNAUTHORIZED

from acidwatch_api.database.schema import User, DB_ENGINE


async def get_db() -> AsyncGenerator[Session, None]:
    session = Session(bind=DB_ENGINE[0])

    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def get_optional_current_user(
    db: GetDB,
    jwt: Annotated[tuple[str, DecodedJwtToken] | None, Depends(get_jwt_token)],
) -> User | None:
    if jwt is None:
        return None

    user = User(
        id=UUID(jwt[1]["oid"]),
        name=jwt[1]["name"],
        principal_name=jwt[1]["upn"],
    )
    db.merge(user)
    return user


async def get_current_user(
    user: OptionalCurrentUser
) -> User:
    if user is None:
        raise HTTPException(HTTP_401_UNAUTHORIZED)
    return user


GetDB: TypeAlias = Annotated[Session, Depends(get_db)]
OptionalCurrentUser: TypeAlias = Annotated[User | None, Depends(get_optional_current_user)]
CurrentUser: TypeAlias = Annotated[User, Depends(get_current_user)]
