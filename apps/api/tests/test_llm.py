from typing import Any

import pytest

from app.config import Settings
from app.llm import EchoChatModel, get_llm, resolve_provider


def make_settings(**values: Any) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


class FakeChat:
    """Records constructor arguments so no client is built and no network is touched."""

    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


@pytest.fixture(autouse=True)
def fake_clients(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("langchain_anthropic.ChatAnthropic", FakeChat)
    monkeypatch.setattr("langchain_openai.ChatOpenAI", FakeChat)


def test_no_keys_uses_echo() -> None:
    assert isinstance(get_llm(make_settings()), EchoChatModel)


def test_anthropic_key_selects_anthropic_with_cheap_default() -> None:
    llm = get_llm(make_settings(anthropic_api_key="sk-ant-test"))
    assert isinstance(llm, FakeChat)
    assert llm.kwargs["model"] == "claude-haiku-5-5"
    assert llm.kwargs["api_key"].get_secret_value() == "sk-ant-test"


def test_anthropic_model_is_configurable() -> None:
    settings = make_settings(anthropic_api_key="k", anthropic_model="claude-sonnet-5-5")
    llm = get_llm(settings)
    assert isinstance(llm, FakeChat)
    assert llm.kwargs["model"] == "claude-sonnet-5-5"


def test_openai_still_works_on_its_own() -> None:
    llm = get_llm(make_settings(openai_api_key="sk-test"))
    assert isinstance(llm, FakeChat)
    assert llm.kwargs["model"] == "gpt-4o-mini"


def test_auto_prefers_anthropic_when_both_keys_set() -> None:
    settings = make_settings(anthropic_api_key="a", openai_api_key="o")
    assert resolve_provider(settings) == "anthropic"


def test_explicit_provider_overrides_auto() -> None:
    settings = make_settings(anthropic_api_key="a", openai_api_key="o", llm_provider="openai")
    assert resolve_provider(settings) == "openai"
    assert isinstance(
        get_llm(make_settings(anthropic_api_key="a", llm_provider="echo")), EchoChatModel
    )


@pytest.mark.parametrize("provider", ["anthropic", "openai"])
def test_explicit_provider_without_key_fails_clearly(provider: str) -> None:
    with pytest.raises(ValueError, match="requires"):
        get_llm(make_settings(llm_provider=provider))
