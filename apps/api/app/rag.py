import uuid
from typing import Any

import chromadb
from chromadb.api.types import EmbeddingFunction

from app.config import Settings


def build_embedding_function(settings: Settings) -> EmbeddingFunction[Any] | None:
    """Use OpenAI embeddings when a key is set, otherwise Chroma's default local model."""
    if not settings.openai_api_key:
        return None
    from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

    return OpenAIEmbeddingFunction(api_key=settings.openai_api_key)


class Retriever:
    """Thin wrapper around a Chroma collection used as the agent's knowledge base."""

    def __init__(
        self,
        collection_name: str,
        path: str | None = None,
        embedding_function: EmbeddingFunction[Any] | None = None,
    ) -> None:
        client = chromadb.PersistentClient(path=path) if path else chromadb.EphemeralClient()
        if embedding_function:
            self._collection = client.get_or_create_collection(
                collection_name, embedding_function=embedding_function
            )
        else:
            self._collection = client.get_or_create_collection(collection_name)

    def add_documents(self, texts: list[str]) -> int:
        ids = [str(uuid.uuid4()) for _ in texts]
        self._collection.add(documents=texts, ids=ids)
        return len(texts)

    def search(self, query: str, k: int = 3) -> list[str]:
        total = self._collection.count()
        if total == 0:
            return []
        result = self._collection.query(query_texts=[query], n_results=min(k, total))
        documents = result["documents"]
        return documents[0] if documents else []
