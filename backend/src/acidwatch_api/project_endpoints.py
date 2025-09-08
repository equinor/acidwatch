import uuid
from typing import Annotated, Any
from acidwatch_api.database import Project, ProjectAccess, get_db
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ValidationError

from acidwatch_api.authentication import authenticated_user_claims
from acidwatch_api.models.datamodel import Scenario, Result, RunResponse

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# TODO: use rbac instead of connectionstring
# HOST = os.environ.get("COSMOS_DB_URI", "https://acidwatch.documents.azure.com:443/")
# cred = authentication.get_credential()
# project_db = db_client.DBClient(HOST, cred)

router = APIRouter(dependencies=[Depends(authenticated_user_claims)])


class ProjectForm(BaseModel):
    private: bool
    name: str
    description: str


@router.post("/projects")
def create_project(
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
    form: ProjectForm,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    oid: str = claims.get("oid", "")
    name: str = claims.get("name", "")

    project = Project(
        owner_id=oid,
        owner=name,
        name=form.name,
        description=form.description,
    )
    project_access = ProjectAccess(project=project, access_id=oid)
    db.add_all([project, project_access])


@router.get("/projects")
def list_projects(
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    user: str = claims.get("oid") or ""
    projects = db.execute(select(ProjectAccess).where(ProjectAccess.access_id == user)).fetchall()
    return projects


@router.delete("/project/{project_id}")
def delete_project(
    project_id: uuid.UUID,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    project = db.get(Project, project_id)
    if not project:
        db.delete(project)
        db.commit()


@router.put("/project/{project_id}/switch_publicity")
def update_project(
    project_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> dict[str, Any]:
    user: str = claims.get("oid") or ""
    result = project_db.switch_project_publicity(project_id, user)
    return result


@router.post("/project/{project_id}/scenario")
def create_new_scenario(
    scenario: Scenario,
    project_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> Scenario:
    user: str = claims.get("oid") or ""
    user_name = claims.get("name") or ""
    res = project_db.init_scenario(
        project_id=project_id,
        scenario=scenario,
        user=user,
        user_name=user_name,
    )
    return res


@router.get("/project/{project_id}/scenario/{scenario_id}")
def get_scenario(
    project_id: str,
    scenario_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> Scenario:
    user: str = claims.get("oid") or ""
    scenario = Scenario.model_validate(
        project_db.fetch_scenario_and_validate_user(scenario_id, project_id, user)
    )
    return scenario


@router.delete("/project/{project_id}/scenario/{scenario_id}")
def delete_scenario(
    project_id: str,
    scenario_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> dict[str, Any]:
    user: str = claims.get("oid") or ""
    project_db.delete_scenario(scenario_id, project_id, user)
    return {"id": scenario_id}


@router.put("/project/{project_id}/scenario/{scenario_id}")
def update_scenario(
    scenario: Scenario,
    project_id: str,
    scenario_id: uuid.UUID,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> Scenario:
    user: str = claims.get("oid") or ""
    project_db.delete_results_of_scenario(str(scenario_id), project_id, user=user)

    return project_db.upsert_scenario(
        Scenario(
            id=scenario_id,
            name=scenario.name,
            project_id=project_id,
            scenario_inputs=scenario.scenario_inputs,
        ),
        user,
    )


@router.get("/project/{project_id}/scenarios")
def get_complete_scenarios_of_project(project_id: str) -> list[Scenario]:
    scenarios = project_db.get_scenarios_of_project(project_id=project_id)
    scenario_objects: list[Scenario] = []
    for s in scenarios:
        try:
            validated_scenario_object = Scenario.model_validate(s)
            scenario_objects.append(validated_scenario_object)
        except ValidationError:
            logger.error(
                f"Unable to fetch scenario with ID '{s.id}'."
            )  # TODO: use logger

    return scenario_objects


# --------- Results ----------


@router.get("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def get_result(
    project_id: str,
    scenario_id: str,
    result_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> RunResponse:
    user: str = claims.get("oid") or ""
    result = project_db.get_result(result_id, scenario_id, project_id, user)
    return RunResponse.model_validate(result)


@router.delete("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def delete_scenario_result(
    project_id: str,
    scenario_id: str,
    result_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> Result:
    user: str = claims.get("oid") or ""
    result = project_db.delete_result(result_id, scenario_id, project_id, user)
    return Result.model_validate(result)


@router.get("/project/{project_id}/scenario/{scenario_id}/results")
def get_results_of_scenario(
    project_id: str,
    scenario_id: str,
    claims: Annotated[dict[str, Any], Depends(authenticated_user_claims)],
) -> list[RunResponse]:
    user: str = claims.get("oid") or ""
    results = project_db.get_results_of_scenario(scenario_id, project_id, user)

    result_objects: list[RunResponse] = [
        RunResponse.model_validate(result) for result in results
    ]

    return result_objects


@router.post("/project/{project_id}/scenario/{scenario_id}/result")
def save_result(
    scenario_id: str,
    form: RunResponse,
) -> None:
    result = Result(
        scenario_id=scenario_id,
        initial_concentrations=runResponse.initial_concentrations,
        final_concentrations=runResponse.final_concentrations,
        panels=list(runResponse.panels) or [],
    )
    res = project_db.upsert_result(result=result)
    return Result.model_validate(res)
