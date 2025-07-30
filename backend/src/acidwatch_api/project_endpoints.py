import os
import uuid
from typing import Annotated, Any
import jwt
from fastapi import APIRouter, Depends
from pydantic import ValidationError

from acidwatch_api import db_client, local_db
from acidwatch_api.authentication import oauth2_scheme, authenticated_user_claims
from acidwatch_api.models.datamodel import Project, Scenario, Result
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

router = APIRouter()


@router.post("/project")
def create_new_project(
    project: Project,
) -> Project:
    # Authentication disabled for development
    project.id = uuid.uuid4()
    res = project_db.init_project(project=project)
    return Project(id=res["id"], name=res["name"])


@router.get("/projects")
def get_available_projects() -> list[dict[str, Any]]:
    # Authentication disabled for development
    projects = project_db.get_projects_with_access(user=None)
    return projects


@router.delete("/project/{project_id}")
def delete_project(project_id: str) -> str:
    # Authentication disabled for development
    project_db.delete_project(project_id, user=None)
    return project_id


@router.put("/project/{project_id}/switch_publicity")
def update_project(
    project_id: str
) -> dict[str, Any]:
    # Authentication disabled for development
    result = project_db.switch_project_publicity(project_id, user=None)
    return result


@router.post("/project/{project_id}/scenario")
def create_new_scenario(
    scenario: Scenario,
    project_id: str,
) -> Scenario:
    # Authentication disabled for development
    res = project_db.init_scenario(
        project_id=project_id,
        scenario=scenario,
        user=None,
        user_name=None,
    )
    return res


@router.get("/project/{project_id}/scenario/{scenario_id}")
def get_scenario(
    project_id: str,
    scenario_id: str,
) -> Scenario:
    # Authentication disabled for development
    scenario = Scenario.model_validate(
        project_db.fetch_scenario_and_validate_user(scenario_id, project_id, user=None)
    )
    return scenario


@router.delete("/project/{project_id}/scenario/{scenario_id}")
def delete_scenario(
    project_id: str, scenario_id: str
) -> dict[str, Any]:
    # Authentication disabled for development
    project_db.delete_scenario(scenario_id, project_id, user=None)
    return {"id": scenario_id}


@router.put("/project/{project_id}/scenario/{scenario_id}")
def update_scenario(
    scenario: Scenario,
    project_id: str,
    scenario_id: uuid.UUID,
) -> Scenario:
    # Authentication disabled for development
    project_db.delete_results_of_scenario(str(scenario_id), project_id, user=None)

    return project_db.upsert_scenario(
        Scenario(
            id=scenario_id,
            name=scenario.name,
            project_id=project_id,
            scenario_inputs=scenario.scenario_inputs,
        ),
        user=None,
    )


@router.get("/project/{project_id}/scenarios")
def get_complete_scenarios_of_project(project_id: str) -> list[Scenario]:
    # Authentication disabled for development
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
) -> Result:
    # Authentication disabled for development
    result = project_db.get_result(result_id, scenario_id, project_id, user=None)
    return Result.model_validate(result)


@router.delete("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def delete_scenario_result(
    project_id: str,
    scenario_id: str,
    result_id: str,
) -> Result:
    # Authentication disabled for development
    result = project_db.delete_result(result_id, scenario_id, project_id, user=None)
    return Result.model_validate(result)


@router.get("/project/{project_id}/scenario/{scenario_id}/results")
def get_results_of_scenario(
    project_id: str, scenario_id: str
) -> list[Result]:
    # Authentication disabled for development
    results = project_db.get_results_of_scenario(scenario_id, project_id, user=None)

    result_objects: list[Result] = []
    for r in results:
        try:
            result_objects.append(Result.model_validate(r))
        except ValidationError:
            print(f"Unable to fetch result with ID '{r['id']}'")

    return result_objects


@router.post("/project/{project_id}/scenario/{scenario_id}/result")
def save_result(
    result: Result,
) -> Scenario:
    res = project_db.upsert_result(result=result)
    return Scenario.model_validate(res)
