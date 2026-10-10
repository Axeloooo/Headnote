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
            "Set OPENAI_API_KEY to get real model answers."
        )
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])


def get_llm(settings: Settings) -> BaseChatModel:
    if not settings.openai_api_key:
        return EchoChatModel()
    from langchain_openai import ChatOpenAI
    from pydantic import SecretStr

    return ChatOpenAI(
        model=settings.openai_model,
        api_key=SecretStr(settings.openai_api_key),
        temperature=0,
    )
