import logging
from typing import Annotated, Any

import httpx
import jwt
import jwt.algorithms
import msal
from fastapi import HTTPException, Security
from fastapi.security import OAuth2AuthorizationCodeBearer

from acidwatch_api import configuration
from acidwatch_api.configuration import MODEL_TYPE

logger = logging.getLogger(__name__)


def _fetch_openid_configuration(auth_endpoint: str) -> Any:
    oid_conf_response = httpx.get(auth_endpoint)
    oid_conf_response.raise_for_status()
    return oid_conf_response.json()


oid_conf = _fetch_openid_configuration(configuration.OPEN_ID_CONFIG_URI)

jwks_client = jwt.PyJWKClient(oid_conf["jwks_uri"])

oauth2_scheme = Security(
    OAuth2AuthorizationCodeBearer(
        authorizationUrl=oid_conf["authorization_endpoint"],
        tokenUrl=oid_conf["token_endpoint"],
        auto_error=False,
        scopes={configuration.BACKEND_API_SCOPE: "Access to the AcidWatch API"},
    )
)

swagger_ui_init_oauth_config: dict[str, Any] = {
    "clientId": configuration.FRONTEND_CLIENT_ID,
    "appName": "Acidwatch API",
    "usePkceWithAuthorizationCodeGrant": True,  # Enable PKCE
    "scope": configuration.BACKEND_API_SCOPE,
}


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
                "api://" + configuration.BACKEND_CLIENT_ID,
                configuration.BACKEND_CLIENT_ID,
            ],
        )
        return claims
    except jwt.exceptions.InvalidTokenError as e:
        raise HTTPException(401, str(e))


confidential_app = msal.ConfidentialClientApplication(
    client_id=configuration.BACKEND_CLIENT_ID,
    authority=configuration.AUTHORITY,
    client_credential=configuration.BACKEND_CLIENT_SECRET,
)


def acquire_token_for_downstream_api(api: MODEL_TYPE, jwt_token: str) -> str:
    match api:
        case MODEL_TYPE.CO2SPEC:
            scope = configuration.CO2SPEC_API_SCOPE
        case MODEL_TYPE.ARCS:
            scope = configuration.ARCS_API_SCOPE
        case _:
            raise ValueError(f"Unsupported model type: {api}")
    result = confidential_app.acquire_token_on_behalf_of(
        user_assertion=jwt_token, scopes=[scope]
    )
    if "error" in result:
        logger.error(result["error"])
        raise HTTPException(401, result["error_description"])
    return result["access_token"]
