import os
from azure.identity import DefaultAzureCredential, ClientSecretCredential
import pandas as pd
import requests
import json


def read_experiment_data(file_path):

    df = pd.read_csv(file_path, skiprows=0, low_memory=False)
    df.replace("NA", pd.NA, inplace=True)
    numeric_cols = df.columns.difference(["Exp", "Step", "Reactions"])
    df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors='coerce')

    return df


def format_json_data(df):
    entries = []
    for _, row in df.iterrows():

        species = (df.columns)[5:]
        dict_species = {}

        for key in species:
            if key != "Reactions":
                dict_species[key] = str(row[key])

        entry = {
            "id": row.name,
            "time": row["Time"],
            "species": dict_species,
        }
        entries.append(entry)

    payload = {
        "data": {
            "general": {
                "name": "ABC-04",
                "description": "Processed experimental data",
                "date": "2025-02-19",
                "source": "CSV Import"
            },
            "inputConcentrations": {
                "listInputConcentrations": {
                    "entries": entries,
                    "repeatableDefs": {"species": list(df.columns[5:])}
                }
            }
        },
        "comments": [],
        "restrictedMode": "Unchanged",
        "revisionDescription": "Initial data upload"
    }

    return payload


def upload_data(payload):

    os.environ["AZURE_TENANT_ID"] = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
    os.environ["AZURE_CLIENT_ID"] = "49385006-e775-4109-9635-2f1a2bdc8ea8"

    # credential = ClientSecretCredential(
    #     tenant_id=os.environ["AZURE_TENANT_ID"],
    #     client_id=os.environ["AZURE_CLIENT_ID"],
    #     client_secret=os.environ["AZURE_CLIENT_SECRET"]
    # )
    # token = credential.get_token("https://management.azure.com/.default")

    token = "first attempt failed, I manually copied token from frontend instead"
    url = "https://api-oasis-test.radix.equinor.com/CO2LabResults"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    return response.status_code, response.text


if __name__ == "__main__":
    file_path = "KDC3.csv"

    df = read_experiment_data(file_path)
    payload = format_json_data(df)
    status, response = upload_data(payload)
    print(f"Response Code: {status}, Response: {response}")
