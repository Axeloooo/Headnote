from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLAlchemy URL. Postgres URLs as hosts hand them out (postgres://, postgresql://) are
    # rewritten to the psycopg 3 driver, so a Neon connection string can be pasted in unchanged.
    database_url: str = "sqlite:///./headnote.db"

    # Which chat model to use: "auto", "anthropic", "openai" or "echo". "auto" picks Anthropic when
    # ANTHROPIC_API_KEY is set, then OpenAI when OPENAI_API_KEY is set, otherwise the offline echo.
    llm_provider: Literal["auto", "anthropic", "openai", "echo"] = "auto"

    anthropic_api_key: str | None = None
    # Haiku is the cheap default; set ANTHROPIC_MODEL=claude-sonnet-5-5 for stronger answers.
    anthropic_model: str = "claude-haiku-5-5"

    # OpenAI also provides the embeddings when its key is set.
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # None keeps the Chroma index in memory; set a directory to persist it.
    chroma_path: str | None = None
    chroma_collection: str = "headnote_docs"

    # Index the bundled documents in app/demo_docs at startup when the Chroma index is empty. For
    # hosts with an ephemeral disk (Render free), where the index is empty after every spin-down.
    seed_demo_documents: bool = False

    # Comma-separated browser origins allowed to call the API cross-origin, for example
    # "https://headnote.example.com". Leave empty when the web app proxies /api same-origin.
    cors_origins: str = ""

    # LangSmith tracing is read from the standard env vars:
    # LANGSMITH_TRACING=true and LANGSMITH_API_KEY=...

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, url: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix) :]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
