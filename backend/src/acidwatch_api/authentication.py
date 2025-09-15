import logging
import os
from typing import Annotated, Any
import httpx
import jwt
import msal  # type: ignore
from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import OAuth2AuthorizationCodeBearer

from acidwatch_api.configuration import SETTINGS

logger = logging.getLogger(__name__)

load_dotenv()


HEADERS = {"WWW-Authenticate": "Bearer"}
API_AUDIENCE = "api://" + os.environ.get("BACKEND_CLIENT_ID", "")
CLIENT_ID = os.environ.get("BACKEND_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("BACKEND_CLIENT_SECRET", "")


def _fetch_openid_configuration(auth_endpoint: str) -> Any:
    oid_conf_response = httpx.get(auth_endpoint)
    oid_conf_response.raise_for_status()
    return oid_conf_response.json()


oid_conf = _fetch_openid_configuration(SETTINGS.open_id_config_uri)

jwks_client = jwt.PyJWKClient(oid_conf["jwks_uri"])

oauth2_scheme = Security(
    OAuth2AuthorizationCodeBearer(
        authorizationUrl=oid_conf["authorization_endpoint"],
        tokenUrl=oid_conf["token_endpoint"],
        auto_error=False,
        scopes={SETTINGS.backend_api_scope: "Access to the AcidWatch API"},
    )
)

swagger_ui_init_oauth_config: dict[str, Any] = {
    "clientId": SETTINGS.frontend_client_id,
    "appName": "Acidwatch API",
    "usePkceWithAuthorizationCodeGrant": True,  # Enable PKCE
    "scope": SETTINGS.backend_api_scope,
}


def get_jwt_token(
    jwt_token: Annotated[str, oauth2_scheme],
) -> str | None:
    if not jwt_token:
        return None
    try:
        signing_key = jwks_client.get_signing_key(
            jwt.get_unverified_header(jwt_token)["kid"]
        )
        jwt.decode(
            jwt_token,
            key=signing_key,
            algorithms=["RS256"],
            audience=[
                "api://" + SETTINGS.backend_client_id,
                SETTINGS.backend_client_id,
            ],
        )
        return jwt_token
    except jwt.exceptions.InvalidTokenError:
        return None


def authenticated_user_claims(
    jwt_token: Annotated[str, oauth2_scheme],
) -> Any:
    if not jwt_token:
        raise HTTPException(401, "Missing token in Authorization header")
    try:
        signing_key = jwks_client.get_signing_key(
            jwt.get_unverified_header(jwt_token)["kid"]
        )
        claims = jwt.decode(
            jwt_token,
            key=signing_key,
            algorithms=["RS256"],
            audience=[
                "api://" + SETTINGS.backend_client_id,
                SETTINGS.backend_client_id,
            ],
        )
        return claims
    except jwt.exceptions.InvalidTokenError as e:
        raise HTTPException(401, str(e))


confidential_app = msal.ConfidentialClientApplication(
    client_id=SETTINGS.backend_client_id,
    authority=SETTINGS.authority,
    client_credential=SETTINGS.backend_client_secret,
)


def acquire_token_for_downstream_api(scope: str, jwt_token: str) -> str:
    result = confidential_app.acquire_token_on_behalf_of(
        user_assertion=jwt_token, scopes=[scope]
    )
    if "error" in result:
        logger.error(result["error"])
        raise HTTPException(401, result["error_description"])
    return result["access_token"]  # type: ignore
