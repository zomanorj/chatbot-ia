from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Mpanampy"
    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+asyncpg://mpanampy:mpanampy@localhost:5432/mpanampy"
    redis_url: str = "redis://localhost:6379/0"

    # JSON list in env, e.g. CORS_ORIGINS='["https://app.mpanampy.mg"]'
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
