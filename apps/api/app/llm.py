from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.config import Settings


class EchoChatModel(BaseChatModel):
    """Offline stand-in so the app runs without an API key."""

    @property
    def _llm_type(self) -> str:
        return "echo"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        system = str(messages[0].content) if messages else ""
        last = str(messages[-1].content) if messages else ""
        grounded = " with retrieved context" if "Use this context" in system else ""
        text = (
            f"[offline echo{grounded}] You said: {last}\n"
            "Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) to get real model answers."
        )
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])


def resolve_provider(settings: Settings) -> str:
    """Turn LLM_PROVIDER (including "auto") into a concrete provider, checking its key is set."""
    provider = settings.llm_provider
    if provider == "auto":
        if settings.anthropic_api_key:
            return "anthropic"
        return "openai" if settings.openai_api_key else "echo"
    if provider == "anthropic" and not settings.anthropic_api_key:
        raise ValueError("LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY")
    if provider == "openai" and not settings.openai_api_key:
        raise ValueError("LLM_PROVIDER=openai requires OPENAI_API_KEY")
    return provider


def get_llm(settings: Settings) -> BaseChatModel:
    provider = resolve_provider(settings)
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        from pydantic import SecretStr

        assert settings.anthropic_api_key
        return ChatAnthropic(  # type: ignore[call-arg]
            model=settings.anthropic_model,
            api_key=SecretStr(settings.anthropic_api_key),
            temperature=0,
            max_tokens=1024,
        )
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        from pydantic import SecretStr

        assert settings.openai_api_key
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=SecretStr(settings.openai_api_key),
            temperature=0,
        )
    return EchoChatModel()
