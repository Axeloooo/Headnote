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


def test_documents_are_listed_and_cited(client):
    added = client.post(
        "/documents",
        json={
            "documents": [
                {
                    "title": "Vendor contract",
                    "text": "Either party may terminate on sixty days notice.\n\nNo fee.",
                    "collection": "Contracts",
                    "kind": "pdf",
                }
            ]
        },
    )
    assert added.json() == {"added": 1}

    listing = client.get("/documents").json()
    assert [(d["title"], d["collection"], d["kind"], d["chunks"]) for d in listing] == [
        ("Vendor contract", "Contracts", "pdf", 1)
    ]

    body = client.post("/chat", json={"message": "terminate on sixty days notice"}).json()
    assert body["sources"][0]["document"] == "Vendor contract"
    assert body["sources"][0]["id"] == "s1"
    assert "sixty days" in body["sources"][0]["excerpt"]
    assert body["elapsed_ms"] >= 0


def test_bare_texts_still_work_and_get_a_title(client):
    assert client.post("/documents", json={"texts": ["Plain note\nsecond line"]}).json() == {
        "added": 1
    }
    assert client.get("/documents").json()[0]["title"] == "Plain note"


def test_documents_request_must_not_be_empty(client):
    assert client.post("/documents", json={}).status_code == 422


def test_recent_conversations_are_listed_newest_first(client):
    client.post("/chat", json={"message": "first question"})
    client.post("/chat", json={"message": "second question"})
    titles = [c["title"] for c in client.get("/conversations").json()]
    assert titles == ["second question", "first question"]


def test_cors_is_off_by_default_and_opt_in(tmp_path):
    def build(name: str, origins: str):
        settings = Settings(database_url=f"sqlite:///{tmp_path / name}.db", cors_origins=origins)
        retriever = Retriever(collection_name=f"cors-{name}", embedding_function=KeywordEmbedding())
        return TestClient(create_app(settings=settings, retriever=retriever))

    headers = {"Origin": "https://app.example.com"}
    closed = build("closed", "").get("/health", headers=headers)
    assert "access-control-allow-origin" not in closed.headers
    opened = build("open", "https://app.example.com").get("/health", headers=headers)
    assert opened.headers["access-control-allow-origin"] == "https://app.example.com"
