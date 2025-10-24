from __future__ import annotations

from typing import Iterator, Annotated, TypeAlias

from fastapi import Depends, Request
from sqlalchemy.orm import Session


def get_db(request: Request) -> Iterator[Session]:
    with request.state.session() as session:
        try:
            yield session
            session.commit()
        except:
            session.rollback()
            raise
        finally:
            session.close()


GetDB: TypeAlias = Annotated[Session, Depends(get_db)]
