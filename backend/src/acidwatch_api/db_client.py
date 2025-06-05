from __future__ import annotations
import json
from typing import Any
from uuid import uuid4
import azure.cosmos.cosmos_client as cosmos_client
import azure.cosmos.exceptions as exceptions
from acidwatch_api.models.datamodel import Project, Scenario, Result
from acidwatch_api.error_handler import BadRequest, Unauthorized


class DBClient:
    def __init__(self, connection_string: str) -> None:
        self.client = cosmos_client.CosmosClient.from_connection_string(
            connection_string
        )
        # self.client = cosmos_client.CosmosClient(host, credential=cred) # TODO: use rbac instead of connectionstring
        db = self.client.get_database_client("acidwatch")
        self.project_container = db.get_container_client("projects")
        self.results_container = db.get_container_client("results")
        self.scenario_container = db.get_container_client("scenarios")

    # --------- Projects ----------

    def init_project(self, project: Project) -> dict[str, Any]:
        res = self.project_container.upsert_item(
            body=json.loads(project.model_dump_json())
        )
        return res

    def rename_project(
        self, project_id: str, project_name: str, user: str
    ) -> dict[str, Any]:
        dto = self._fetch_project_and_validate_user(project_id, user)
        dto["name"] = project_name
        res = self.project_container.upsert_item(body=dto)
        return res

    def switch_project_publicity(self, project_id: str, user_id: str) -> dict[str, Any]:
        dto = self._fetch_project_and_validate_user(project_id, user_id)
        dto["private"] = not dto["private"]

        res = self.project_container.upsert_item(body=dto)
        return res

    def delete_project(self, project_id: str, user: str) -> None:
        self._fetch_project_and_validate_user(project_id, user)

        try:
            self.delete_scenarios_of_project(project_id, user)
            self.project_container.delete_item(
                item=project_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise BadRequest(
                f"Did not find project with id: {project_id}",
                project_id=project_id,
            )

    def get_projects_with_access(self, user: str) -> list[dict[str, Any]]:
        project_ids = list(
            self.project_container.query_items(
                query=(
                    "SELECT * FROM r WHERE NOT r.private OR ARRAY_CONTAINS(r.access_ids, @user_id)"
                ),
                parameters=[{"name": "@user_id", "value": user}],
                enable_cross_partition_query=True,
            )
        )
        return project_ids

    def _fetch_project_and_validate_user(
        self, project_id: str, user: str, validate_user: bool = True
    ) -> dict[str, Any]:
        try:
            project = self.project_container.read_item(
                item=project_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise BadRequest(
                f"Did not find project with id: {project_id}",
                project_id=project_id,
            )

        if validate_user and project["private"] and user not in project["access_ids"]:
            raise Unauthorized(
                f"User {user} does not have access to this project",
                project_id=project_id,
            )

        return project

    # --------- Scenarios ----------

    def init_scenario(
        self, project_id: str, scenario: Scenario, user: str, user_name: str
    ) -> Scenario:
        self._fetch_project_and_validate_user(project_id, user)
        scenario.id = uuid4()
        scenario.project_id = project_id
        scenario.owner = user_name
        self.scenario_container.upsert_item(body=json.loads(scenario.model_dump_json()))
        return scenario

    def upsert_scenario(self, scenario: Scenario, user: str) -> Scenario:
        self.fetch_scenario_and_validate_user(
            str(scenario.id), str(scenario.project_id), user
        )
        res = self.scenario_container.upsert_item(
            body=json.loads(scenario.model_dump_json())
        )
        return Scenario.model_validate(res)

    def get_scenarios_of_project(self, project_id: str) -> list[Scenario]:
        return [
            Scenario.model_validate(x)
            for x in self.scenario_container.query_items(
                query=("SELECT * FROM r"), partition_key=[project_id]
            )
        ]

    def delete_scenario(self, scenario_id: str, project_id: str, user: str) -> None:
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        try:
            self.delete_results_of_scenario(scenario_id, project_id, user)
            self.scenario_container.delete_item(
                item=scenario_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise BadRequest(
                f"Did not find scenario with id: {scenario_id}",
                scenario_id=scenario_id,
            )

    def delete_scenarios_of_project(self, project_id: str, user: str) -> None:
        scenarios = self.get_scenarios_of_project(project_id)
        for scenario in scenarios:
            self.delete_scenario(str(scenario.id), project_id, user)

    def fetch_scenario_and_validate_user(
        self, scenario_id: str, project_id: str, user: str, validate_user: bool = True
    ) -> dict[str, Any]:
        try:
            scenario = self.scenario_container.read_item(
                item=scenario_id, partition_key=[project_id]
            )
        except exceptions.CosmosResourceNotFoundError:
            raise BadRequest(
                f"Did not find scenario with id: {scenario_id}",
                scenario_id=scenario_id,
            )
        self._fetch_project_and_validate_user(
            project_id, user, validate_user=validate_user
        )
        return scenario

    # --------- Results ----------

    def get_result(
        self, result_id: str, scenario_id: str, project_id: str, user: str
    ) -> Result:
        response = self.results_container.read_item(
            result_id, partition_key=[scenario_id]
        )
        result = Result(**response)
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        return result

    def upsert_result(self, result: Result) -> dict[str, Any]:
        res = self.results_container.upsert_item(
            body=json.loads(result.model_dump_json())
        )
        return res

    def delete_result(
        self, result_id: str, scenario_id: str, project_id: str, user: str
    ) -> None:
        self.fetch_scenario_and_validate_user(scenario_id, project_id, user)
        res = self.results_container.delete_item(result_id, partition_key=[scenario_id])
        return res

    def get_results_of_scenario(
        self, scenario_id: str, project_id: str, user: str, validate_user: bool = True
    ) -> list[dict[str, Any]]:
        self.fetch_scenario_and_validate_user(
            scenario_id, project_id, user, validate_user=validate_user
        )
        result_list = list(
            self.results_container.query_items(
                query=("SELECT * FROM r WHERE r.scenario_id=@scenario_id"),
                partition_key=[scenario_id],
                parameters=[{"name": "@scenario_id", "value": scenario_id}],
            )
        )
        return result_list

    def delete_results_of_scenario(
        self, scenario_id: str, project_id: str, user: str
    ) -> list[str]:
        result_ids = list(
            [
                a["id"]
                for a in self.get_results_of_scenario(scenario_id, project_id, user)
            ]
        )
        for id in result_ids:
            self.results_container.delete_item(
                item=str(id), partition_key=[scenario_id]
            )
        return result_ids
