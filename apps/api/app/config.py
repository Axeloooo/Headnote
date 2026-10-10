from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./headnote.db"

    # Leave the OpenAI key empty to run offline with the echo model.
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # None keeps the Chroma index in memory; set a directory to persist it.
    chroma_path: str | None = None
    chroma_collection: str = "headnote_docs"

    # LangSmith tracing is read from the standard env vars:
    # LANGSMITH_TRACING=true and LANGSMITH_API_KEY=...


@lru_cache
def get_settings() -> Settings:
    return Settings()
