from functools import lru_cache

from sqlalchemy.engine import URL
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Spell Check"
    environment: str = "dev"
    auth_mode: str = "google"
    session_secret: str
    session_max_age_seconds: int = 28800
    frontend_url: str = "http://localhost:5173"
    dev_user_email: str = "dev@example.test"
    dev_user_name: str = "Dev User"
    dev_user_type: str = "TEACHER"
    dev_user_is_admin: bool = True

    database_url: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_host: str | None = None
    db_port: int = 1433
    db_name: str | None = None
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_trust_server_certificate: bool = True

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        if not all([self.db_user, self.db_password, self.db_host, self.db_name]):
            raise ValueError("Set DATABASE_URL or DB_USER, DB_PASSWORD, DB_HOST, DB_NAME")
        return URL.create(
            "mssql+pyodbc",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
            query={
                "driver": self.db_driver,
                "TrustServerCertificate": "yes" if self.db_trust_server_certificate else "no",
            },
        ).render_as_string(hide_password=False)

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8010/auth/callback"

    local_storage_path: str = "/app/tmp"
    api_public_url: str = "http://localhost:8010"

    typhoon_ocr_api_key: str = "placeholder-typhoon-key"
    typhoon_base_url: str = "https://api.opentyphoon.ai/v1"
    open_router_api_key: str
    openrouter_model: str = "google/gemini-2.5-flash"

    use_pymupdf: bool = True

@lru_cache
def get_settings() -> Settings:
    return Settings()
