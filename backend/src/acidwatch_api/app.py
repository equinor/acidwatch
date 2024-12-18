import os
from typing import Annotated, Any
from acidwatch_api.models.project_data_model import ProjectDTO
import fastapi
import jwt
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import acidwatch_api
from acidwatch_api import configuration, authentication, db_client
from acidwatch_api.authentication import (
    authenticated_user_claims,
    swagger_ui_init_oauth_config,
    oauth2_scheme,
)
from acidwatch_api.models import AVAILABLE_MODELS

app = fastapi.FastAPI(dependencies=[fastapi.Depends(authenticated_user_claims)])
app.swagger_ui_init_oauth = swagger_ui_init_oauth_config

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "https://frontend-acidwatch-dev.radix.equinor.com",
    "https://frontend-acidwatch-prod.radix.equinor.com",
    "https://acidwatch.radix.equinor.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: use rbac instead of connectionstring
# HOST = os.environ.get("COSMOS_DB_URI", "https://acidwatch.documents.azure.com:443/")
# cred = authentication.get_credential()
# project_db = db_client.DBClient(HOST, cred)
CONNECTION_STRING = os.environ.get("CONNECTION_STRING")
project_db = db_client.DBClient(CONNECTION_STRING)


class Model(BaseModel):
    name: configuration.MODEL_TYPE


@app.get("/models")
def get_models() -> list[Model]:
    return [Model(name=model.MODEL) for model in AVAILABLE_MODELS]


for model in AVAILABLE_MODELS:
    app.include_router(model.router, prefix=f"/models/{model.MODEL.value}")


@app.post("/project")
def create_new_project(
    jwt_token: Annotated[str, oauth2_scheme],
    project: ProjectDTO,
) -> ProjectDTO:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    res = project_db.init_project(project_name=project.name, user=user)
    return ProjectDTO(id=res["id"], name=res["name"])


@app.delete("/project/{project_id}")
def delete_project(project_id: str, jwt_token: Annotated[str, oauth2_scheme]) -> str:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    project_db.delete_project(project_id, user)
    return project_id


@app.get("/projects")
def get_available_projects(
    jwt_token: Annotated[str, oauth2_scheme]
) -> list[dict[str, Any]]:
    claims = jwt.decode(jwt_token, options={"verify_signature": False})
    user = claims.get("oid")
    projects = project_db.get_projects_with_access(user=user)
    return projects
