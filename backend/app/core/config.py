from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "B2B Orders API"
    environment: Literal["development", "production", "test"] = "development"
    api_v1_prefix: str = "/api/v1"
    docs_url: str = "/api/docs"
    openapi_url: str = "/api/openapi.json"
    log_level: str = "INFO"
    enable_metrics: bool = True

    database_url: str = "sqlite+aiosqlite:///./b2b_orders.db"
    secret_key: str = "change-me-please-use-at-least-32-characters"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    access_cookie_name: str = "b2b_access_token"
    refresh_cookie_name: str = "b2b_refresh_token"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    cors_origins: str = "http://localhost,http://127.0.0.1"

    first_superuser_login: str = "admin"
    first_superuser_password: str = "admin123"
    first_superuser_full_name: str = "Системный администратор"
    seed_demo_manager_login: str = "manager"
    seed_demo_manager_password: str = "manager123"
    seed_demo_manager_full_name: str = "Иван Иванов"
    seed_data: bool = True
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
