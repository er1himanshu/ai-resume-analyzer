from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume Analyzer"
    environment: str = "development"
    database_url: str = "******localhost:5432/resume_analyzer"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
