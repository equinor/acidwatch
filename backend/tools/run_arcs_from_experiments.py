'''
fetch all items from oasis
for item in items:
    get temperature and pressure columns and all columns prefixed with "In_"
    format data into a SimulationRequest object
    call post_arcs_run with the SimulationRequest object
    create and store scenario
    store result using db_client.upsert_results
'''
import math
import os
import uuid
import requests
import json

from azure.identity import AzureCliCredential
from acidwatch_api.db_client import DBClient
from acidwatch_api.models.datamodel import SimulationRequest, Scenario, Result
from dotenv import load_dotenv
from src.acidwatch_api.models.arcs import convert_to_arcs_simulation_request
from src.acidwatch_api.models.datamodel import SimulationResults

load_dotenv()

CONNECTION_STRING = os.environ.get("CONNECTION_STRING")

db_client = DBClient(connection_string=CONNECTION_STRING)
oasis_url = "https://api-oasis-test.radix.equinor.com/CO2LabResults"
credential = AzureCliCredential()
token = credential.get_token("https://api-oasis-test.radix.equinor.com/.default")
oasis_token = token.token
oasis_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {oasis_token}"
    }


def get_oasis_items():
    response = requests.get(oasis_url, headers=oasis_headers)
    response.raise_for_status()
    return response.json()

def update_oasis(item):
    url = f"{oasis_url}/{item['id']}"
    response = requests.put(url, headers=oasis_headers, data=json.dumps(item))
    response.raise_for_status()
    return response.status_code, response.text

def snap_to_temp(temp):
    valid_temps = [200, 250, 300, 350, 400]
    return min(valid_temps, key=lambda x: abs(x - temp))

def snap_to_pressure(pressure):
    valid_pressures = [1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 125, 150, 175, 200, 225, 250, 275, 300]
    return min(valid_pressures, key=lambda x: abs(x - pressure))

def format_simulation_request(item):

    species = item["species"]
    all_concs = {
        "CH2O2": 0,
        "CH3CH2OH": 0,
        "CO": 0,
        "H2": 0,
        "O2": 0,
        "CH3COOH": 0,
        "CH3OH": 0,
        "CH4": 0,
        "CH3CHO": 0,
        "H2CO": 0,
        "CO2": 0,
        "H2O": 0,
        "H2SO4": 0,
        "H2S": 0,
        "S8": 0,
        "SO2": 0,
        "H2SO3": 0,
        "HNO3": 0,
        "NO2": 0,
        "NH3": 0,
        "HNO2": 0,
        "NO": 0,
        "N2": 0,
        "NOHSO4": 0
      }
    input_keys = all_concs.copy()
    input_keys.update({key[3:]: value for key, value in species.items() if key.startswith("In_")})

    concentrations = {
         key: (int(value) if isinstance(value, int) else float(value)) * 10e-7
         for key, value in input_keys.items()
    }

    cleaned_data = {k: (0 if math.isnan(float(v)) else float(v)) for k, v in concentrations.items()}

    settings = {
        "Temperature": item["temperature"] + 273,
        "Pressure": item["pressure"],
        "SampleLength": 5000
    }

    simulation_request = SimulationRequest(
        settings=settings,
        concs=cleaned_data,
    )
    return simulation_request


def convert_simulation_result_to_result(simulation_result: SimulationResults, scenario_id: uuid) -> Result:
    result = Result(
        id=uuid.uuid4(),
        scenario_id=str(scenario_id),
        raw_results=simulation_result.model_dump_json()
    )
    return result


def post_arcs_run(
    simulation_request: SimulationRequest,
) -> SimulationResults:
    arcs_simulation_request = convert_to_arcs_simulation_request(simulation_request)

    arcs_url = "http://localhost:8000/run_simulation"  # https://api-arcs-test.radix.equinor.com/run"
    res = requests.post(
        arcs_url,
        json=arcs_simulation_request.model_dump(),
        timeout=300.0,

    )

    if res.status_code == 200:
        response_data = res.json()
        return SimulationResults(**response_data)
    else:
        print(f"Error running arcs, check arcs log: {res.status_code}")



def process_items():
    items = get_oasis_items()

    project_id = "b52f0df1-9929-4d5a-b210-c45e573852f2" # project to hold all simulations, manually created in frontend
    for item in items:
         for experiment in item["data"]["labData"]["concentrations"]["entries"]:

            experiment_id =item["data"]["general"]["name"] + "-" + experiment["step"]
            simulation_request = format_simulation_request(experiment)
            result = post_arcs_run(simulation_request)

            # create and save scenario
            scenario = Scenario(
                id=uuid.uuid4(),
                name=experiment_id,
                project_id=project_id,
                scenario_inputs=simulation_request,
            )
            db_client.init_scenario(
                project_id=project_id,
                scenario=scenario,
                user="9fe2013a-6c9c-468d-b869-ed8dea7dbec0",
                user_name="Harald Eggen"
            )

            result_id = db_client.upsert_result(convert_simulation_result_to_result(result, scenario.id))
            print("Out: " + str(result_id))

if __name__ == "__main__":
    process_items()