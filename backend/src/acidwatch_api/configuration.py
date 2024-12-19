import os
from enum import StrEnum

from dotenv import load_dotenv

load_dotenv()

TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
OPEN_ID_CONFIG_URI = (
    "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0/v2.0/.well-known/openid-configuration"
)
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

FRONTEND_CLIENT_ID = os.environ.get("FRONTEND_CLIENT_ID", "")
BACKEND_CLIENT_ID = os.environ.get("BACKEND_CLIENT_ID", "")
BACKEND_CLIENT_SECRET = os.environ.get("BACKEND_CLIENT_SECRET", "")

BACKEND_API_SCOPE = os.environ.get("BACKEND_API_SCOPE", "")

ARCS_API_SCOPE = os.environ.get("ARCS_API_SCOPE", "")
ARCS_API_BASE_URI = os.environ.get("ARCS_API_BASE_URI", "")

CO2SPEC_API_SCOPE = os.environ.get("CO2SPEC_API_SCOPE", "")
CO2SPEC_API_BASE_URI = os.environ.get("CO2SPEC_API_BASE_URI", "")

_REQUIRED_VARS = {
    "FRONTEND_CLIENT_ID": FRONTEND_CLIENT_ID,
    "BACKEND_CLIENT_ID": BACKEND_CLIENT_ID,
    "BACKEND_CLIENT_SECRET": BACKEND_CLIENT_SECRET,
    "BACKEND_API_SCOPE": BACKEND_API_SCOPE,
    "ARCS_API_BASE_URI": ARCS_API_BASE_URI,
    "ARCS_API_SCOPE": ARCS_API_SCOPE,
    "CO2SPEC_API_SCOPE": CO2SPEC_API_SCOPE,
    "CO2SPEC_API_BASE_URI": CO2SPEC_API_BASE_URI,
}


class MODEL_TYPE(StrEnum):
    DUMMY = "dummy"
    ARCS = "arcs"
    CO2SPEC = "co2spec"


def validate_config():
    missing_vars = [k for k, v in _REQUIRED_VARS.items() if not v]

    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")


validate_config()
