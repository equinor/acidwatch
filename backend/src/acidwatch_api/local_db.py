class LocalDB:
    def __init__(self):
        self.projects = {}
        self.scenarios = {}
        self.results = {}

    def init_project(self, project):
        project_id = str(project.id)
        self.projects[project_id] = project.dict()
        return self.projects[project_id]

    def get_projects_with_access(self, user):
        return [
            project
            for project in self.projects.values()
            if user in project.get("access_ids", [])
        ]

    def delete_project(self, project_id, user):
        project = self.projects.get(project_id)
        if not project:
            return None  # or raise an exception
        if project.get("owner_id") == user:
            del self.projects[project_id]
        else:
            return None  # the user is not the owner

    def switch_project_publicity(self, project_id, user):
        project = self.projects.get(project_id)
        if project and project.get("owner_id") == user:
            project["is_public"] = not project.get("is_public", False)
            self.projects[project_id] = project
        return project

    def init_scenario(self, project_id, scenario, user, user_name):
        scenario_id = str(scenario.id)
        self.scenarios[scenario_id] = scenario.dict()
        return self.scenarios[scenario_id]

    def fetch_scenario_and_validate_user(self, scenario_id, project_id, user):
        scenario = self.scenarios.get(scenario_id)
        if not scenario or scenario.get("owner_id") != user:
            return None  # or raise an exception
        return scenario

    def delete_scenario(self, scenario_id, project_id, user):
        scenario = self.scenarios.get(scenario_id)
        if scenario and scenario.get("owner_id") == user:
            del self.scenarios[scenario_id]

    def upsert_scenario(self, scenario, user):
        scenario_id = str(scenario.id)
        self.scenarios[scenario_id] = scenario.dict()
        return self.scenarios[scenario_id]

    def get_scenarios_of_project(self, project_id):
        return [
            scenario
            for scenario in self.scenarios.values()
            if scenario.get("project_id") == project_id
        ]

    def get_result(self, result_id, scenario_id, project_id, user):
        return self.results.get(result_id)

    def delete_result(self, result_id, scenario_id, project_id, user):
        result = self.results.get(result_id)
        if result:
            del self.results[result_id]
            return result_id

    def get_results_of_scenario(self, scenario_id, project_id, user):
        return [
            result
            for result in self.results.values()
            if result.get("scenario_id") == scenario_id
        ]

    def upsert_result(self, result):
        result_id = str(result.id)
        self.results[result_id] = result.dict()
        return self.results[result_id]

    # Additional method to delete results of a scenario when updating a scenario.
    # This is mentioned in `update_scenario` route but not provided in `project_db`.
    def delete_results_of_scenario(self, scenario_id, project_id, user):
        results_to_delete = [
            result_id
            for result_id, result in self.results.items()
            if result.get("scenario_id") == scenario_id
        ]
        for result_id in results_to_delete:
            del self.results[result_id]
