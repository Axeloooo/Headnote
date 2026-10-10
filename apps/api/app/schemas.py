from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class DocumentsRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


class DocumentsResponse(BaseModel):
    added: int
