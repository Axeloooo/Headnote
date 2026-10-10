import hashlib
from typing import Any

import pytest
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.rag import Retriever


class KeywordEmbedding(EmbeddingFunction[Documents]):
    """Deterministic bag-of-words embedding so tests never hit the network."""

    def __init__(self) -> None:
        self._dim = 64

    def get_config(self) -> dict[str, Any]:
        return {"dim": self._dim}

    @staticmethod
    def build_from_config(config: dict[str, Any]) -> "KeywordEmbedding":
        return KeywordEmbedding()

    def __call__(self, input: Documents) -> Embeddings:  # noqa: A002
        vectors = []
        for text in input:
            vec = [0.0] * self._dim
            for word in text.lower().split():
                bucket = int(hashlib.md5(word.encode()).hexdigest(), 16) % self._dim
                vec[bucket] += 1.0
            vectors.append(vec)
        return vectors

    @staticmethod
    def name() -> str:
        return "keyword-test"


@pytest.fixture
def client(request, tmp_path):
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}")
    retriever = Retriever(
        collection_name=f"test-{request.node.name}",
        embedding_function=KeywordEmbedding(),
    )
    app = create_app(settings=settings, retriever=retriever)
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_chat_creates_conversation_and_replies(client):
    response = client.post("/chat", json={"message": "hello there"})
    assert response.status_code == 200
    body = response.json()
    assert body["conversation_id"] > 0
    assert "hello there" in body["reply"]


def test_chat_continues_existing_conversation(client):
    first = client.post("/chat", json={"message": "first"}).json()
    second = client.post(
        "/chat",
        json={"conversation_id": first["conversation_id"], "message": "second"},
    ).json()
    assert second["conversation_id"] == first["conversation_id"]

    messages = client.get(f"/conversations/{first['conversation_id']}/messages").json()
    assert [m["role"] for m in messages] == ["user", "assistant", "user", "assistant"]
    assert [m["content"] for m in messages if m["role"] == "user"] == ["first", "second"]


def test_chat_uses_ingested_documents(client):
    client.post("/documents", json={"texts": ["Headnote stores conversations in SQLAlchemy"]})
    body = client.post("/chat", json={"message": "where are conversations stored"}).json()
    assert "with retrieved context" in body["reply"]


def test_unknown_conversation_returns_404(client):
    response = client.post("/chat", json={"conversation_id": 999, "message": "hi"})
    assert response.status_code == 404
    assert client.get("/conversations/999/messages").status_code == 404


def test_empty_message_is_rejected(client):
    assert client.post("/chat", json={"message": ""}).status_code == 422
