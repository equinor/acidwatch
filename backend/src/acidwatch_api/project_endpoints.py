import os
import uuid
from typing import Any
from fastapi import APIRouter, Depends
from pydantic import ValidationError

from acidwatch_api import db_client, local_db
from acidwatch_api.authentication import CurrentUser, get_current_user
from acidwatch_api.models.datamodel import Project, Scenario, Result, RunResponse

import logging

logger = logging.getLogger(__name__)

# TODO: use rbac instead of connectionstring
# HOST = os.environ.get("COSMOS_DB_URI", "https://acidwatch.documents.azure.com:443/")
# cred = authentication.get_credential()
# project_db = db_client.DBClient(HOST, cred)

CONNECTION_STRING = os.environ.get("CONNECTION_STRING")

project_db: local_db.LocalDB | db_client.DBClient
if CONNECTION_STRING is None or CONNECTION_STRING == "local":
    project_db = local_db.LocalDB()
else:
    project_db = db_client.DBClient(CONNECTION_STRING)

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/project")
def create_new_project(
    user: CurrentUser,
    project: Project,
) -> Project:
    project.access_ids = [user.id]
    project.owner_id = user.id
    project.owner = user.name
    project.id = uuid.uuid4()
    res = project_db.init_project(project=project)
    return Project(id=res["id"], name=res["name"])


@router.get("/projects")
def get_available_projects(
    user: CurrentUser,
) -> list[dict[str, Any]]:
    projects = project_db.get_projects_with_access(user=user.id)
    return projects


@router.delete("/project/{project_id}")
def delete_project(
    project_id: str,
    user: CurrentUser,
) -> str:
    project_db.delete_project(project_id, user.id)
    return project_id


@router.put("/project/{project_id}/switch_publicity")
def update_project(
    project_id: str,
    user: CurrentUser,
) -> dict[str, Any]:
    result = project_db.switch_project_publicity(project_id, user.id)
    return result


@router.post("/project/{project_id}/scenario")
def create_new_scenario(
    scenario: Scenario,
    project_id: str,
    user: CurrentUser,
) -> Scenario:
    res = project_db.init_scenario(
        project_id=project_id,
        scenario=scenario,
        user=user.id,
        user_name=user.name,
    )
    return res


@router.get("/project/{project_id}/scenario/{scenario_id}")
def get_scenario(
    project_id: str,
    scenario_id: str,
    user: CurrentUser,
) -> Scenario:
    scenario = Scenario.model_validate(
        project_db.fetch_scenario_and_validate_user(scenario_id, project_id, user.id)
    )
    return scenario


@router.delete("/project/{project_id}/scenario/{scenario_id}")
def delete_scenario(
    project_id: str,
    scenario_id: str,
    user: CurrentUser,
) -> dict[str, Any]:
    project_db.delete_scenario(scenario_id, project_id, user.id)
    return {"id": scenario_id}


@router.put("/project/{project_id}/scenario/{scenario_id}")
def update_scenario(
    scenario: Scenario,
    project_id: str,
    scenario_id: uuid.UUID,
    user: CurrentUser,
) -> Scenario:
    project_db.delete_results_of_scenario(str(scenario_id), project_id, user=user.id)

    return project_db.upsert_scenario(
        Scenario(
            id=scenario_id,
            name=scenario.name,
            project_id=project_id,
            scenario_inputs=scenario.scenario_inputs,
        ),
        user.id,
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
    user: CurrentUser,
) -> RunResponse:
    result = project_db.get_result(result_id, scenario_id, project_id, user.id)
    return RunResponse.model_validate(result)


@router.delete("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def delete_scenario_result(
    project_id: str,
    scenario_id: str,
    result_id: str,
    user: CurrentUser,
) -> Result:
    result = project_db.delete_result(result_id, scenario_id, project_id, user.id)
    return Result.model_validate(result)


@router.get("/project/{project_id}/scenario/{scenario_id}/results")
def get_results_of_scenario(
    project_id: str,
    scenario_id: str,
    user: CurrentUser,
) -> list[RunResponse]:
    results = project_db.get_results_of_scenario(scenario_id, project_id, user.id)

    result_objects: list[RunResponse] = [
        RunResponse.model_validate(result) for result in results
    ]

    return result_objects


@router.post("/project/{project_id}/scenario/{scenario_id}/result")
def save_result(
    runResponse: RunResponse,
    scenario_id: str,
) -> Result:
    result = Result(
        scenario_id=scenario_id,
        initial_concentrations=runResponse.model_input.concentrations,
        final_concentrations=runResponse.final_concentrations,
        panels=list(runResponse.panels) or [],
    )
    res = project_db.upsert_result(result=result)
    return Result.model_validate(res)
