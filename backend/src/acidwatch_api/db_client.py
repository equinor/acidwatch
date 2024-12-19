import json
from uuid import uuid4
import azure.core.credentials
import azure.cosmos.cosmos_client as cosmos_client
import azure.cosmos.exceptions as exceptions
from acidwatch_api.models.datamodel import Project, Scenario, Result
from acidwatch_api.error_handler import ApiError


class DBClient:
    def __init__(self, connection_string: str):
        self.client = cosmos_client.CosmosClient.from_connection_string(connection_string)
        # self.client = cosmos_client.CosmosClient(host, credential=cred) # TODO: use rbac instead of connectionstring
        self.project_container = None
        self.scenario_container = None
        self.results_container = None
        try:
            db = self.client.get_database_client("acidwatch")
            self.project_container = db.get_container_client("projects")
            self.results_container = db.get_container_client("results")
            self.scenario_container = db.get_container_client("scenarios")
        except exceptions.CosmosHttpResponseError:
            return

    # --------- Projects ----------

    def init_project(self, project_name, user):
        dto = Project()
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
            self.project_container.delete_item(item=project_id, partition_key=[project_id])
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {
                    "code": "bad_request",
                    "description": "Did not find project with id: {0}".format(project_id),
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
            project = self.project_container.read_item(item=project_id, partition_key=[project_id])
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {
                    "code": "bad_request",
                    "description": "Did not find project with id: {0}".format(project_id),
                },
                400,
                project_id=project_id,
            )

        if validate_user and user not in project["access_ids"]:
            raise ApiError(
                {
                    "code": "Unauthorized",
                    "description": "User {0} does not have access to this project!".format(user),
                },
                401,
                project_id=project_id,
            )
        else:
            return project

    # --------- Scenarios ----------

    def init_scenario(self, scenario_name, project_id, scenario_inputs, user):
        self._fetch_project_and_validate_user(project_id, user)
        scenario = Scenario()
        scenario.id = uuid4()
        scenario.name = scenario_name
        scenario.project_id = project_id
        scenario.scenario_inputs = scenario_inputs

        self.scenario_container.upsert_item(body=json.loads(scenario.model_dump_json()))
        return scenario

    def upsert_scenario(self, scenario: Scenario, user):
        self.fetch_scenario_and_validate_user(str(scenario.id), str(scenario.project_id), user)
        res = self.scenario_container.upsert_item(body=json.loads(scenario.model_dump_json()))
        return res

    def get_scenarios_of_project(self, project_id):
        scenarios = list(self.scenario_container.query_items(query=("SELECT * FROM r"), partition_key=[project_id]))
        return scenarios

    def delete_scenario(self, scenario_id, project_id, user):
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        try:
            self.delete_results_of_scenario(scenario_id, project_id, user)
            self.scenario_container.delete_item(item=scenario_id, partition_key=[project_id])
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {"code": "bad_request", "description": "Did not find scenario with id: {0}".format(scenario_id)},
                400,
                scenario_id,
            )

    def delete_scenarios_of_project(self, project_id, user):
        scenarios = self.get_scenarios_of_project(project_id)
        for scenario in scenarios:
            self.delete_scenario(scenario["id"], project_id, user)
        return scenarios

    def fetch_scenario_and_validate_user(self, scenario_id, project_id, user, validate_user=True):

        try:
            scenario = self.scenario_container.read_item(item=scenario_id, partition_key=[project_id])
        except exceptions.CosmosResourceNotFoundError:
            raise ApiError(
                {"code": "bad_request", "description": "Did not find scenario with id: {0}".format(scenario_id)},
                400,
                scenario_id,
            )
        self._fetch_project_and_validate_user(project_id, user, validate_user=validate_user)
        return scenario

    # --------- Results ----------

    def get_result(self, result_id, scenario_id, project_id, user):
        response = self.results_container.read_item(result_id, partition_key=[scenario_id])
        result = Result(**response)
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        return result

    def upsert_result(self, result: Result, project_id, user):
        self.fetch_scenario_and_validate_user(str(result.scenario_id), project_id, user)
        res = self.results_container.upsert_item(body=json.loads(result.model_dump_json()))
        return res

    def delete_result(self, result_id, scenario_id, project_id, user):
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        res = self.results_container.delete_item(result_id, partition_key=[scenario_id])
        return res

    def get_results_of_scenario(self, scenario_id, project_id, user, validate_user=True):
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user, validate_user=validate_user)
        result_list = list(
            self.results_container.query_items(
                query=("SELECT * FROM r WHERE r.scenario_id=@scenario_id"),
                partition_key=[scenario_id],
                parameters=[{"name": "@scenario_id", "value": scenario_id}],
            )
        )
        return result_list

    def delete_results_of_scenario(self, scenario_id, project_id, user):
        result_ids = list([a["id"] for a in self.get_results_of_scenario(scenario_id, project_id, user)])
        for id in result_ids:
            self.results_container.delete_item(item=str(id), partition_key=[scenario_id])
        return result_ids
