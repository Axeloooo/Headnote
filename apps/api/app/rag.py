import uuid
from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.api.types import EmbeddingFunction

from app.config import Settings

CHUNK_CHARS = 800


def build_embedding_function(settings: Settings) -> EmbeddingFunction[Any] | None:
    """Use OpenAI embeddings when a key is set, otherwise Chroma's default local model."""
    if not settings.openai_api_key:
        return None
    from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

    return OpenAIEmbeddingFunction(api_key=settings.openai_api_key)


def chunk_text(text: str, size: int = CHUNK_CHARS) -> list[str]:
    """Split on blank lines, packing paragraphs up to `size` characters per chunk."""
    chunks: list[str] = []
    current = ""
    for paragraph in (p.strip() for p in text.split("\n\n")):
        if not paragraph:
            continue
        while len(paragraph) > size:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(paragraph[:size])
            paragraph = paragraph[size:]
        if current and len(current) + len(paragraph) + 2 > size:
            chunks.append(current)
            current = ""
        current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        chunks.append(current)
    return chunks


@dataclass(frozen=True)
class Hit:
    """One retrieved chunk. `document_id` is None for chunks added without a document row."""

    text: str
    document_id: int | None
    chunk: int


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

    def count(self) -> int:
        return int(self._collection.count())

    def add_documents(self, texts: list[str]) -> int:
        ids = [str(uuid.uuid4()) for _ in texts]
        self._collection.add(documents=texts, ids=ids)
        return len(texts)

    def add_chunks(self, document_id: int, chunks: list[str]) -> None:
        if not chunks:
            return
        self._collection.add(
            documents=chunks,
            ids=[str(uuid.uuid4()) for _ in chunks],
            metadatas=[{"document_id": document_id, "chunk": i} for i in range(len(chunks))],
        )

    def delete_document(self, document_id: int) -> None:
        self._collection.delete(where={"document_id": document_id})

    def search_hits(self, query: str, k: int = 3) -> list[Hit]:
        total = self._collection.count()
        if total == 0:
            return []
        result = self._collection.query(query_texts=[query], n_results=min(k, total))
        documents = (result["documents"] or [[]])[0]
        metadatas = (result["metadatas"] or [[]])[0]
        hits: list[Hit] = []
        for text, meta in zip(documents, metadatas, strict=False):
            document_id = meta.get("document_id") if meta else None
            chunk = meta.get("chunk", 0) if meta else 0
            hits.append(
                Hit(
                    text=text,
                    document_id=int(document_id) if isinstance(document_id, int) else None,
                    chunk=int(chunk) if isinstance(chunk, int) else 0,
                )
            )
        return hits

    def search(self, query: str, k: int = 3) -> list[str]:
        return [hit.text for hit in self.search_hits(query, k)]
