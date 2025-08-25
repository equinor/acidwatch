import os
import json
from acidwatch_api.db_client import DBClient
from dotenv import load_dotenv

load_dotenv()
CONNECTION_STRING = os.environ.get("CONNECTION_STRING")
db_client = DBClient(connection_string=CONNECTION_STRING)

## TODO: use with care, briefly tested on selected records in dev db, needs more testing before running in prod

if __name__ == "__main__":
    results = db_client.results_container.read_all_items()
    for res in list(results):
        try:
            raw_data = res["raw_results"]
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)

            if "results" in raw_data and "initfinaldiff" in raw_data["results"]:
                # old format
                initfinaldiff = raw_data["results"]["initfinaldiff"]
                res["initialConcentrations"] = initfinaldiff.get("initial", {})
                res["finalConcentrations"] = initfinaldiff.get("final", {})
                res["panels"] = raw_data.get("analysis", {})
            else:
                # new incorrect format
                res["initialConcentrations"] = raw_data.get(
                    "initialConcentrations", {}
                )
                res["finalConcentrations"] = raw_data.get("finalConcentrations", {})
                res["panels"] = raw_data.get("panels", [])

            if "raw_results" in res:
                del res["raw_results"]
            if "output_concs" in res:
                del res["output_concs"]

            # db_client.results_container.upsert_item(body=res)
            print(f"Processed result: {res['id']}")
        except Exception as e:
            print(f"Error processing result: {res.get('id', 'unknown')} - {str(e)}")
