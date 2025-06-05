from __future__ import annotations
from typing import Any

from acidwatch_api.error_handler import BadRequest
from acidwatch_api.models.datamodel import Project, Result, Scenario


class LocalDB:
    def __init__(self) -> None:
        self.projects: dict[str, dict[str, Any]] = {}
        self.scenarios: dict[str, Scenario] = {}
        self.results: dict[str, dict[str, Any]] = {}

    def init_project(self, project: Project) -> dict[str, Any]:
        project_id = str(project.id)
        self.projects[project_id] = project.model_dump()
        return self.projects[project_id]

    def get_projects_with_access(self, user: str) -> list[dict[str, Any]]:
        return [
            project
            for project in self.projects.values()
            if user in project.get("access_ids", [])
        ]

    def delete_project(self, project_id: str, user: str) -> None:
        project = self.projects.get(project_id)
        if not project:
            return None  # or raise an exception
        if project.get("owner_id") == user:
            del self.projects[project_id]
        else:
            return None  # the user is not the owner

    def switch_project_publicity(self, project_id: str, user: str) -> dict[str, Any]:
        project = self.projects[project_id]
        if project and project.get("owner_id") == user:
            project["is_public"] = not project.get("is_public", False)
            self.projects[project_id] = project
        return project

    def init_scenario(
        self, project_id: str, scenario: Scenario, user: str, user_name: str
    ) -> Scenario:
        scenario_id = str(scenario.id)
        self.scenarios[scenario_id] = scenario.model_copy()
        return self.scenarios[scenario_id]

    def fetch_scenario_and_validate_user(
        self, scenario_id: str, project_id: str, user: str
    ) -> Scenario:
        scenario = self.scenarios.get(scenario_id)
        if not scenario or scenario.owner != user:
            raise BadRequest(
                f"Did not find scenario with id: {scenario_id}",
                scenario_id=scenario_id,
            )
        return scenario

    def delete_scenario(self, scenario_id: str, project_id: str, user: str) -> None:
        scenario = self.scenarios.get(scenario_id)
        if scenario and scenario.owner == user:
            del self.scenarios[scenario_id]

    def upsert_scenario(self, scenario: Scenario, user: str) -> Scenario:
        scenario_id = str(scenario.id)
        self.scenarios[scenario_id] = scenario.model_copy()
        return self.scenarios[scenario_id]

    def get_scenarios_of_project(self, project_id: str) -> list[Scenario]:
        return [
            scenario
            for scenario in self.scenarios.values()
            if scenario.project_id == project_id
        ]

    def get_result(
        self, result_id: str, scenario_id: str, project_id: str, user: str
    ) -> dict[str, Any]:
        return self.results[result_id]

    def delete_result(
        self, result_id: str, scenario_id: str, project_id: str, user: str
    ) -> None:
        self.results.pop(result_id, None)

    def get_results_of_scenario(
        self, scenario_id: str, project_id: str, user: str
    ) -> list[dict[str, Any]]:
        return [
            result
            for result in self.results.values()
            if result.get("scenario_id") == scenario_id
        ]

    def upsert_result(self, result: Result) -> dict[str, Any]:
        result_id = str(result.id)
        self.results[result_id] = result.model_dump()
        return self.results[result_id]

    # Additional method to delete results of a scenario when updating a scenario.
    # This is mentioned in `update_scenario` route but not provided in `project_db`.
    def delete_results_of_scenario(
        self, scenario_id: str, project_id: str, user: str
    ) -> None:
        results_to_delete = [
            result_id
            for result_id, result in self.results.items()
            if result.get("scenario_id") == scenario_id
        ]
        for result_id in results_to_delete:
            del self.results[result_id]
