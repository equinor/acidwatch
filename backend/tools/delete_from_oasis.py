import requests

from azure.identity import AzureCliCredential


oasis_url = "https://api-oasis-prod.radix.equinor.com/CO2LabResults"
credential = AzureCliCredential()
token = credential.get_token("https://api-oasis-prod.radix.equinor.com/.default")
oasis_token = token.token
oasis_headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {oasis_token}",
}


def get_oasis_items():
    response = requests.get(oasis_url, headers=oasis_headers)
    response.raise_for_status()
    return response.json()


def process_items():
    items = get_oasis_items()
    for item in items:
        print(f"Deleting item: {item}")
        url = f"{oasis_url}/{item['id']}"
        response = requests.delete(url, headers=oasis_headers)
        response.raise_for_status()


if __name__ == "__main__":
    process_items()
