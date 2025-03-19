import os
from datetime import datetime
from azure.identity import AzureCliCredential
import pandas as pd
import requests
import json

# Skeleton for uploading data from excel the OASIS. Needs to be customized for each specific use case
# Use as a starting point and modify format_json_data as needed


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
    token = credential.get_token("https://api-oasis-test.radix.equinor.com/.default")
    token = token.token
    url = "https://api-oasis-test.radix.equinor.com/CO2LabResults"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    return response.status_code, response.text


if __name__ == "__main__":
    df = pd.read_excel("Experimental database.xlsx", header=0, sheet_name="KDC 3")
    # df_sim = pd.read_excel("Comparison table v0.5.xlsx", header=0, sheet_name="ARCS (origina+web) and Rectoro")
    grouped = df.groupby("Exp.")
    for exp_name, group in grouped:
        payload_exp = format_json_data(group, exp_name)
        status, response = upload_data(payload_exp)
        print(f"Exp: {exp_name}, Response Code: {status}, Response: {response}")

        # Uploading simulation runs
        # df = df_sim[df_sim["Exp."].str.contains(exp_name, na=False)]

        # input_columns = df[["P", "T", "H2O", "O2", "SO2", "NO2", "H2S", "CO"]]
        # input_columns.columns = [col if i < 2 else f"In_{col}" for i, col in enumerate(input_columns.columns)]

        # arcs_orig_columns = df.filter(like="_final_ARCS ORG")
        # arcs_orig_columns.columns = ["Out_" + col.replace("_final_ARCS ORG", "") for col in arcs_orig_columns.columns]

        # arcs_web_columns = df.filter(like="_final_ARCS WEB")
        # arcs_web_columns.columns = ["Out_" + col.replace("_final_ARCS WEB", "") for col in arcs_web_columns.columns]

        # reactoro_columns = df.filter(like="_final_REAKTORO")
        # reactoro_columns.columns = ["Out_" + col.replace("_final_REAKTORO", "") for col in reactoro_columns.columns]

        # reactoro_df = pd.concat([input_columns, reactoro_columns], axis=1)
        # arcs_org_df = pd.concat([input_columns, arcs_orig_columns], axis=1)
        # arcs_web_df = pd.concat([input_columns, arcs_web_columns], axis=1)

        # payload_arcs_web = format_json_data(arcs_web_df, exp_name + "_ARCS_web", "Simulation results ARCS web version")
        # payload_arcs_org = format_json_data(arcs_org_df, exp_name + "_ARCS_original", "Simulation results ARCS original version")
        # payload_reactoro = format_json_data(reactoro_df, exp_name + "_Reactoro", "Simulation results Reactoro")

        # status, response = upload_data(payload_arcs_org)
        # print(f"Exp: {exp_name}, Response Code: {status}, Response: {response}")

        # status, response = upload_data(payload_reactoro)
        # print(f"Exp: {exp_name}, Response Code: {status}, Response: {response}")
