from datetime import datetime
from azure.identity import AzureCliCredential
import pandas as pd
import requests
import json

# Skeleton for uploading data from excel the OASIS. Needs to be customized for each specific use case
# Use as a starting point and modify format_json_data as needed

oasis_url = "https://api-oasis-prod.radix.equinor.com"


def read_experiment_data(file_path):
    df = pd.read_csv(file_path, skiprows=0, low_memory=False)
    df.replace("NA", pd.NA, inplace=True)
    numeric_cols = df.columns.difference(["Exp", "Step", "Reactions"])
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
    return df


def format_json_data(df, exp_name, desc=""):
    entries = []
    i = 0
    for _, row in df.iterrows():
        species = (df.columns)[5:]
        dict_species = {}
        for key in species:
            dict_species[key] = str(row[key])
        entry = {
            "id": i,
            "step": row["Step"],
            "time": row["Time"],
            "temperature": row["Temp"],
            "pressure": row["Pressure"],
            "species": dict_species,
        }
        entries.append(entry)
        i += 1
    payload = {
        "data": {
            "general": {
                "name": exp_name,
                "description": desc,
                "date": datetime.now().isoformat().split("T")[0],
                "source": "Excel import from KDC-III",
            },
            "labData": {
                "concentrations": {
                    "entries": entries,
                    "repeatableDefs": {"species": list(df.columns[5:])},
                }
            },
        },
        "comments": [],
        "restrictedMode": "Unchanged",
        "revisionDescription": "Initial data upload",
    }
    return payload


def upload_data(payload):
    credential = AzureCliCredential()
    token = credential.get_token(f"{oasis_url}/.default")
    token = token.token
    url = f"{oasis_url}/CO2LabResults"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    return response.status_code, response.text


if __name__ == "__main__":
    df = pd.read_excel("database V2.xlsx", header=0, sheet_name="Clean")
    grouped = df.groupby("Exp.")
    for exp_name, group in grouped:
        payload_exp = format_json_data(group, exp_name)
        status, response = upload_data(payload_exp)
        print(f"Exp: {exp_name}, Response Code: {status}")
