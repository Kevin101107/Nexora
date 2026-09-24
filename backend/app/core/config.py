from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"  # "development", "test", "production"
    jwt_secret_key: str = "nexora-super-secret-production-signing-key-student-collab"
    jwt_algorithm: str = "HS256"
    jwt_expiry_seconds: int = 7 * 24 * 3600  # 7 days
    allowed_cors_origins: str = "http://localhost:3000"
    demo_mode_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [self.frontend_url.strip()]
        for origin in self.allowed_cors_origins.split(","):
            cleaned = origin.strip()
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
        if not self.is_production and "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        return origins


settings = Settings()
