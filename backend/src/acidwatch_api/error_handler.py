import datetime
from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(
        self, error, status_code: int = 400, scenario_id: str = "", project_id: str = ""
    ):
        current_datetime = datetime.datetime.now().strftime("%d.%m.%Y %H:%M:%S")
        if isinstance(error, str):
            self.error = {
                "code": "bad_request",
                "description": error,
                "datetime": current_datetime,
            }
        elif "description" in error:
            self.error = {
                "code": error["code"],
                "description": error["description"],
                "datetime": current_datetime,
            }
        else:
            self.error = {
                "code": "bad_request",
                "description": "Something went wrong, please try again or contact support.\n",
                "datetime": current_datetime,
            }

        self.status_code = status_code
        self.scenario_id = scenario_id
        self.project_id = project_id


async def handle_generic_exception(request: Request, exc: Exception):
    current_datetime = datetime.datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    return JSONResponse(
        content={
            "code": "internal_server_error",
            "description": "Something went wrong, please try again or contact support.",
            "datetime": current_datetime,
        },
        status_code=500,
    )
