from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str = Field(min_length=1, max_length=4000)


class SourceOut(BaseModel):
    id: str
    label: str
    document: str
    excerpt: str


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str
    sources: list[SourceOut] = []
    elapsed_ms: int = 0


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class NewDocument(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=200_000)
    collection: str = Field(default="General", min_length=1, max_length=80)
    kind: Literal["pdf", "email", "note", "sheet"] = "note"


class DocumentsRequest(BaseModel):
    """Send `documents` with titles, or bare `texts` (titled from their first line)."""

    documents: list[NewDocument] = Field(default_factory=list, max_length=100)
    texts: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def _not_empty(self) -> "DocumentsRequest":
        if not self.documents and not self.texts:
            raise ValueError("send at least one document")
        return self


class DocumentsResponse(BaseModel):
    added: int


class DocumentOut(BaseModel):
    id: int
    title: str
    collection: str
    kind: str
    chunks: int
    created_at: datetime
