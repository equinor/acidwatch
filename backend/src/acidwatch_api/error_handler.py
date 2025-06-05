from __future__ import annotations
from datetime import datetime
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED


class _ApiError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        scenario_id: str | None = None,
        project_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.datetime: str = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
        self.status_code = status_code
        self.scenario_id = scenario_id
        self.project_id = project_id


class BadRequest(_ApiError):
    def __init__(
        self,
        message: str,
        *,
        scenario_id: str | None = None,
        project_id: str | None = None,
    ) -> None:
        super().__init__(
            message,
            status_code=HTTP_400_BAD_REQUEST,
            scenario_id=scenario_id,
            project_id=project_id,
        )


class Unauthorized(_ApiError):
    def __init__(self, message: str, *, project_id: str | None = None) -> None:
        super().__init__(
            message, status_code=HTTP_401_UNAUTHORIZED, project_id=project_id
        )
