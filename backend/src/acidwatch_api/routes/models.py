from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from traceback import print_exception, format_exception
from typing import Annotated, Any
from uuid import UUID, uuid4

from acidwatch_api.database.depends import GetDB, OptionalCurrentUser, get_db
from acidwatch_api.database.schema import Result, Scenario
from fastapi import APIRouter, BackgroundTasks, Security, HTTPException, Depends
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from starlette.status import HTTP_404_NOT_FOUND

from acidwatch_api.authentication import get_jwt_token, confidential_app
from acidwatch_api.models.base import BaseAdapter, get_adapters, InputError, get_parameters_schema
from acidwatch_api.models.datamodel import AnyPanel, RunResponse, RunRequest, ModelInfo

router = APIRouter(prefix="/models", tags=["models"])
RESULTS: dict[UUID, RunResponse | BaseException] = {}


class UserResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime

    name: str
    principal_name: str


class ScenarioResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_id: str
    model_version: str
    concentrations: dict[str, float]
    parameters: dict[str, Any]

    owner: UserResponse | None


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


async def _run_adapter(adapter: BaseAdapter, scenario: Scenario) -> None:
    async for db in get_db():
        try:
            result = await adapter.run()

            concs: dict[str, float]
            panels: list[AnyPanel] = []
            if isinstance(result, dict):
                concs = result
            else:
                concs, *panels = result

            result = Result(
                scenario=scenario,
                concentrations=concs,
                panels=[p.model_dump() for p in panels],
                errors=None,
            )
        except BaseException as exc:
            result = Result(
                scenario=scenario,
                concentrations={},
                panels=[],
                errors=format_exception(exc),
            )

        db.add(result)


@router.get("/")
def list_models(
    jwt_token: str | None = Depends(get_jwt_token),
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in get_adapters().values():
        access_error: str | None = (
            _check_auth(adapter, jwt_token) if adapter.authentication else None
        )
        models.append(
            ModelInfo(
                access_error=access_error,
                model_id=adapter.model_id,
                display_name=adapter.display_name,
                category=adapter.category,
                description=adapter.description,
                valid_substances=adapter.valid_substances,
                parameters=get_parameters_schema(adapter),
            )
        )
    return models


@router.post("/{model_id}/runs")
async def run_model(
    model_id: str,
    request: RunRequest,
    jwt_token: Annotated[str | None, Security(get_jwt_token)],
    db: GetDB,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
) -> UUID:
    adapter_class = get_adapters()[model_id]

    try:
        adapter = adapter_class(
            request.concentrations,
            request.parameters,
            jwt_token,
        )
    except InputError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)
    except ValidationError as exc:
        detail = defaultdict(list)
        for err in exc.errors():
            for loc in err["loc"]:
                detail[loc].append(err["msg"])

        raise HTTPException(status_code=422, detail=dict(detail))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=exc.args)

    scenario = Scenario(
        owner=user,
        model_id=model_id,
        model_version="None",
        concentrations=adapter.concentrations,
        parameters=adapter.parameters.model_dump(),
    )
    db.add(scenario)
    db.commit()

    background_tasks.add_task(_run_adapter, adapter, scenario)

    return scenario.id

    # runid = uuid4()
    # await _run_adapter(adapter, runid)
    # result = RESULTS[runid]

    # if isinstance(result, ValueError):
    #     raise HTTPException(status_code=422, detail=format_exception(result))
    # elif isinstance(result, BaseException):
    #     print_exception(result)
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"Model failed to calculate the change: {format_exception(result)}",
    #     )
    # return result


@router.get("/results/{scenario_id}")
def get_result(scenario_id: UUID, db: GetDB) -> Any:
    query = select(Result).join(Scenario).where(Scenario.id == scenario_id)
    result = db.scalar(query)

    print(f"{result=}")

    if result is None:
        raise HTTPException(HTTP_404_NOT_FOUND)
    if result.errors is not None:
        return {"error": result.errors}
    return {
        "finalConcentrations": result.concentrations,
        "panels": result.panels,
    }
