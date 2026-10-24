from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_KEY = "dev-only-secret-key-do-not-use-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Mpanampy"
    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+asyncpg://mpanampy:mpanampy@localhost:5432/mpanampy"
    redis_url: str = "redis://localhost:6379/0"

    # JSON list in env, e.g. CORS_ORIGINS='["https://app.mpanampy.mg"]'
    cors_origins: list[str] = ["http://localhost:3000"]

    groq_api_key: SecretStr | None = None
    # Production models only: https://console.groq.com/docs/models
    llm_models: list[str] = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
    llm_default_model: str = "openai/gpt-oss-120b"

    # Syntax from https://limits.readthedocs.io, e.g. "20/minute" or "100/hour;20/minute"
    chat_rate_limit: str = "20/minute"
    auth_rate_limit: str = "10/minute"

    # Generate with: openssl rand -hex 32
    secret_key: SecretStr = SecretStr(DEV_SECRET_KEY)
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    # None means secure cookies in production only.
    cookie_secure: bool | None = None
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def secure_cookies(self) -> bool:
        return self.is_production if self.cookie_secure is None else self.cookie_secure

    @property
    def rate_limit_storage_uri(self) -> str:
        return f"async+{self.redis_url}"

    @model_validator(mode="after")
    def _validate(self) -> "Settings":
        if self.llm_default_model not in self.llm_models:
            raise ValueError("LLM_DEFAULT_MODEL must be listed in LLM_MODELS")
        if self.is_production and (
            self.secret_key.get_secret_value() == DEV_SECRET_KEY
            or len(self.secret_key.get_secret_value()) < 32
        ):
            raise ValueError("SECRET_KEY must be set to a random value of at least 32 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
