import json
from uuid import uuid4
import azure.core.credentials
import azure.cosmos.cosmos_client as cosmos_client
import azure.cosmos.exceptions as exceptions
from acidwatch_api.models.project_data_model import ProjectDTO
from acidwatch_api.error_handler import ApiError


class DBClient:
    def __init__(self, connection_string: str):
        self.client = cosmos_client.CosmosClient.from_connection_string(
            connection_string
        )
        # self.client = cosmos_client.CosmosClient(host, credential=cred) # TODO: use rbac instead of connectionstring
        self.project_container = None
        self.scenario_container = None
        self.results_container = None
        try:
            db = self.client.get_database_client("acidwatch")
            self.project_container = db.get_container_client("projects")
            self.results_container = db.get_container_client("results")
        except exceptions.CosmosHttpResponseError:
            return

    def init_project(self, project_name, user):
        dto = ProjectDTO()
        dto.id = uuid4()
        dto.name = project_name
        dto.access_ids = [user]
        res = self.project_container.upsert_item(body=json.loads(dto.json()))
        return res

    def rename_project(self, project_id, project_name, user):
        dto = self._fetch_project_and_validate_user(project_id, user)
        dto["name"] = project_name
        res = self.project_container.upsert_item(body=dto)
        return res

    def delete_project(self, project_id, user):
        self._fetch_project_and_validate_user(project_id, user)

        try:
            self.project_container.delete_item(
                item=project_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {
                    "code": "bad_request",
                    "description": "Did not find project with id: {0}".format(
                        project_id
                    ),
                },
                400,
                project_id=project_id,
            )

    def get_projects_with_access(self, user: str):
        project_ids = list(
            self.project_container.query_items(
                query=("SELECT * FROM r WHERE r.access_ids=[@user_id]"),
                parameters=[{"name": "@user_id", "value": user}],
                enable_cross_partition_query=True,
            )
        )
        return project_ids

    def _fetch_project_and_validate_user(self, project_id, user, validate_user=True):
        try:
            project = self.project_container.read_item(
                item=project_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {
                    "code": "bad_request",
                    "description": "Did not find project with id: {0}".format(
                        project_id
                    ),
                },
                400,
                project_id=project_id,
            )

        if validate_user and user not in project["access_ids"]:
            raise ApiError(
                {
                    "code": "Unauthorized",
                    "description": "User {0} does not have access to this project!".format(
                        user
                    ),
                },
                401,
                project_id=project_id,
            )
        else:
            return project
