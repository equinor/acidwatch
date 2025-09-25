from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    frontend_client_id: str = "49385006-e775-4109-9635-2f1a2bdc8ea8"
    backend_client_id: str = "456cc109-08d7-4c11-bf2e-a7b26660f99e"
    backend_client_secret: str | None = None
    backend_api_scope: str = "api://456cc109-08d7-4c11-bf2e-a7b26660f99e/AcidWatch.User"

    tocomo_api_base_uri: str | None = None
    arcs_api_base_uri: str | None = None

    tenant_id: str = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
    frontend_uri: str = "http://localhost:5173"

    applicationinsights_connection_string: str | None = None

    @property
    def authority(self) -> str:
        return f"https://login.microsoftonline.com/{self.tenant_id}"

    @property
    def open_id_config_uri(self) -> str:
        return "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0/v2.0/.well-known/openid-configuration"


SETTINGS = Settings()
