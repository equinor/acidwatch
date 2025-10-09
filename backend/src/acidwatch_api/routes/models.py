from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from traceback import format_exception
from typing import Any
from uuid import UUID

from sqlalchemy.orm import sessionmaker, Session

from acidwatch_api.database.depends import GetDB
from acidwatch_api.database.schema import Result, Scenario
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, ValidationError
from starlette.status import (
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)

from acidwatch_api.authentication import (
    OptionalCurrentUser,
    confidential_app,
)
from acidwatch_api.models.base import (
    BaseAdapter,
    get_adapters,
    InputError,
    get_parameters_schema,
)
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
    concentrations: dict[str, float]
    parameters: dict[str, Any]

    owner: UserResponse | None


def _check_auth(adapter: type[BaseAdapter], jwt_token: str | None) -> str | None:
    if jwt_token is None:
        return "Must be signed in"

    assert adapter.scope is not None
    result = confidential_app.acquire_token_on_behalf_of(jwt_token, [adapter.scope])
    return result.get("error_description")  # type: ignore


async def _run_adapter(
    session: sessionmaker[Session], adapter: BaseAdapter, scenario: Scenario
) -> None:
    try:
        result = await adapter.run()

        concs: dict[str, float]
        panels: list[AnyPanel] = []
        if isinstance(result, dict):
            concs = result
        else:
            concs, *panels = result

        db_result = Result(
            scenario=scenario,
            concentrations=concs,
            panels=[p.model_dump(mode="json", by_alias=True) for p in panels],
            errors=None,
        )
    except BaseException as exc:
        db_result = Result(
            scenario=scenario,
            concentrations={},
            panels=[],
            errors=format_exception(exc),
        )

    with session() as db:
        try:
            db.add(db_result)
            db.commit()
        except:
            db.rollback()
            raise
        finally:
            db.close()


@router.get("/")
def list_models(
    user: OptionalCurrentUser,
) -> list[ModelInfo]:
    models: list[ModelInfo] = []
    for adapter in get_adapters().values():
        access_error: str | None = (
            _check_auth(adapter, user.jwt_token if user else None)
            if adapter.authentication
            else None
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
def run_model(
    model_id: str,
    run_request: RunRequest,
    request: Request,
    db: GetDB,
    user: OptionalCurrentUser,
    background_tasks: BackgroundTasks,
) -> UUID:
    try:
        adapter_class = get_adapters()[model_id]
    except KeyError:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        adapter = adapter_class(
            run_request.concentrations,
            run_request.parameters,
            user.jwt_token if user else None,
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
        owner_id=user.id if user else None,
        model_id=model_id,
        concentrations=adapter.concentrations,
        parameters=adapter.parameters.model_dump(mode="json", by_alias=True)
        if hasattr(adapter, "parameters")
        else {},
    )
    db.add(scenario)
    db.commit()

    background_tasks.add_task(_run_adapter, request.state.session, adapter, scenario)

    return scenario.id


@router.get("/results/{scenario_id}")
def get_result(scenario_id: UUID, db: GetDB, user: OptionalCurrentUser) -> Any:
    scenario = db.get_one(Scenario, scenario_id)

    if scenario.owner_id is not None:
        if user is None:
            raise HTTPException(HTTP_401_UNAUTHORIZED)
        elif scenario.owner_id != user.id:
            raise HTTPException(HTTP_403_FORBIDDEN)

    result = scenario.result
    if result is None:
        raise HTTPException(HTTP_404_NOT_FOUND)
    if result.errors is not None:
        return {"errors": result.errors}
    return {
        "modelInput": {
            "modelId": result.scenario.model_id,
            "concentrations": result.scenario.concentrations,
            "parameters": result.scenario.parameters,
        },
        "concentrations": result.concentrations,
        "panels": result.panels,
        "errors": None,
    }
