from __future__ import annotations


from typing import Any
from fastapi import APIRouter, Depends
import requests


from acidwatch_api.configuration import SETTINGS
from acidwatch_api.authentication import (
    get_jwt_token,
    acquire_token_for_downstream_api,
)

router = APIRouter()


@router.get("/oasis")
async def get_oasis(
    jwt_token: str = Depends(get_jwt_token),
) -> list[dict[str, Any]]:
    token = acquire_token_for_downstream_api(
        f"{SETTINGS.oasis_uri}/.default", jwt_token
    )
    response = requests.get(
        f"{SETTINGS.oasis_uri}/CO2LabResults",
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()

    return format_lab_data(response.json())


def format_lab_data(response: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lab_data = []

    for item in response:
        for entry in item["data"]["labData"]["concentrations"]["entries"]:
            initial_concentrations = {
                key[len("In_") :].upper(): value
                for key, value in entry["species"].items()
                if key.startswith("In_")
            }
            final_concentrations = {
                key[len("Out_") :].upper(): value
                for key, value in entry["species"].items()
                if key.startswith("Out_")
            }

            lab_data.append(
                {
                    "name": f"{item['data']['general']['name']}-{entry['step']}",
                    "initialConcentrations": initial_concentrations,
                    "finalConcentrations": final_concentrations,
                    "pressure": entry.get("pressure"),
                    "temperature": entry.get("temperature"),
                    "time": entry.get("time"),
                }
            )

    return lab_data
