import json
import logging
import os
import uuid
from typing import Annotated, Any, Union
from uuid import UUID
import jwt
from fastapi import APIRouter
from pydantic import ValidationError

from acidwatch_api import db_client
from acidwatch_api.authentication import oauth2_scheme
from acidwatch_api.error_handler import ApiError
from acidwatch_api.models.datamodel import Project, Scenario, Result

# TODO: use rbac instead of connectionstring
# HOST = os.environ.get("COSMOS_DB_URI", "https://acidwatch.documents.azure.com:443/")
# cred = authentication.get_credential()
# project_db = db_client.DBClient(HOST, cred)
CONNECTION_STRING = os.environ.get("CONNECTION_STRING")
project_db = db_client.DBClient(CONNECTION_STRING)


router = APIRouter()


@router.post("/project")
def create_new_project(
    jwt_token: Annotated[str, oauth2_scheme],
    project: Project,
) -> Project:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    project.access_ids = [user]
    project.owner_id = user
    project.owner = claims.get("name")
    project.id = uuid.uuid4()
    res = project_db.init_project(project=project)
    return Project(id=res["id"], name=res["name"])


@router.get("/projects")
def get_available_projects(jwt_token: Annotated[str, oauth2_scheme]) -> list[dict[str, Any]]:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    projects = project_db.get_projects_with_access(user=user)
    return projects


@router.delete("/project/{project_id}")
def delete_project(project_id: str, jwt_token: Annotated[str, oauth2_scheme]) -> str:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    project_db.delete_project(project_id, user)
    return project_id

@router.put("/project/{project_id}/switch_publicity")
def update_project(project_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    result = project_db.switch_project_publicity(project_id, user)
    return result

@router.post("/project/{project_id}/scenario")
def create_new_scenario(
    scenario: Scenario,
    project_id: str,
    jwt_token: Annotated[str, oauth2_scheme],
) -> Scenario:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")

    res = project_db.init_scenario(
        project_id=project_id,
        scenario=scenario,
        user=user,
    )
    return res


@router.get("/project/{project_id}/scenario/{scenario_id}")
def get_scenario(
    project_id: str,
    scenario_id: str,
    jwt_token: Annotated[str, oauth2_scheme],
) -> Scenario:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    scenario = Scenario(**project_db.fetch_scenario_and_validate_user(scenario_id, project_id, user))
    return scenario


@router.delete("/project/{project_id}/scenario/{scenario_id}")
def delete_scenario(project_id: str, scenario_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    project_db.delete_scenario(scenario_id, project_id, user)
    return {"id": scenario_id}


@router.put("/project/{project_id}/scenario/{scenario_id}")
def update_scenario(scenario: Scenario, project_id: str, scenario_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    record = json.loads(scenario)
    project_db.delete_results_of_scenario(scenario_id, project_id, user=user)

    scenario = project_db.upsert_scenario(
        Scenario(
            id=scenario_id,
            name=record["name"],
            project_id=project_id,
            scenario_inputs=record["scenario_inputs"],
        ),
        user,
    )
    return scenario


@router.get("/project/{project_id}/scenarios")
def get_complete_scenarios_of_project(project_id: str):
    scenarios = project_db.get_scenarios_of_project(project_id=project_id)
    scenario_objects = []
    for s in scenarios:
        try:
            validated_scenario_object = Scenario(**s).model_dump()
            scenario_objects.append(validated_scenario_object)
        except ValidationError:
            print(f"Unable to fetch scenario with ID '{s['id']}'.")  # TODO: use logger

    return scenario_objects


# --------- Results ----------


@router.get("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def get_result(project_id: str, scenario_id: str, result_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    result = project_db.get_result(result_id, scenario_id, project_id, user)
    return result


@router.delete("/project/{project_id}/scenario/{scenario_id}/result/{result_id}")
def delete_scenario_result(project_id: str, scenario_id: str, result_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    result = project_db.delete_result(result_id, scenario_id, project_id, user)
    return result


@router.get("/project/{project_id}/scenario/{scenario_id}/results")
def get_results_of_scenario(project_id: str, scenario_id: str, jwt_token: Annotated[str, oauth2_scheme]):
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    results = project_db.get_results_of_scenario(scenario_id, project_id, user)

    result_objects = []
    for r in results:
        try:
            validated_result_object = Result(**r).model_dump()
            result_objects.append(validated_result_object)
        except ValidationError:
            print(f"Unable to fetch result with ID '{r['id']}'.")

    return result_objects


@router.post("/project/{project_id}/scenario/{scenario_id}/result")
def save_result(
    result: Result,
) -> Scenario:

    res = project_db.upsert_result(result=result)
    return res
