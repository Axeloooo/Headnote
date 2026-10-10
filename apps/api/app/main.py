import time
from collections.abc import Iterator

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.agent import build_agent
from app.config import Settings, get_settings
from app.llm import get_llm
from app.models import Base, Conversation, Document, Message
from app.rag import Hit, Retriever, build_embedding_function, chunk_text
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationOut,
    DocumentOut,
    DocumentsRequest,
    DocumentsResponse,
    MessageOut,
    NewDocument,
    SourceOut,
)

HISTORY_LIMIT = 20
RECENT_LIMIT = 8


def create_app(settings: Settings | None = None, retriever: Retriever | None = None) -> FastAPI:
    settings = settings or get_settings()

    connect_args = (
        {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    )
    engine = create_engine(settings.database_url, connect_args=connect_args)
    Base.metadata.create_all(engine)

    if retriever is None:
        retriever = Retriever(
            settings.chroma_collection,
            path=settings.chroma_path,
            embedding_function=build_embedding_function(settings),
        )
    agent = build_agent(get_llm(settings), retriever)

    app = FastAPI(title="Headnote")
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST"],
            allow_headers=["content-type"],
        )
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    app.state.retriever = retriever

    def get_db(request: Request) -> Iterator[Session]:
        with request.app.state.session_factory() as session:
            yield session

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/documents", response_model=DocumentsResponse)
    def add_documents(body: DocumentsRequest, db: Session = Depends(get_db)) -> DocumentsResponse:
        documents = list(body.documents)
        for text in body.texts:
            first_line = text.strip().splitlines()[0] if text.strip() else "Untitled"
            documents.append(NewDocument(title=first_line[:60] or "Untitled", text=text))
        for item in documents:
            chunks = chunk_text(item.text)
            row = Document(
                title=item.title, collection=item.collection, kind=item.kind, chunks=len(chunks)
            )
            db.add(row)
            db.flush()
            retriever.add_chunks(row.id, chunks)
        db.commit()
        return DocumentsResponse(added=len(documents))

    @app.get("/documents", response_model=list[DocumentOut])
    def list_documents(db: Session = Depends(get_db)) -> list[Document]:
        return list(db.scalars(select(Document).order_by(Document.id.desc())))

    @app.get("/conversations", response_model=list[ConversationOut])
    def list_conversations(db: Session = Depends(get_db)) -> list[Conversation]:
        query = select(Conversation).order_by(Conversation.id.desc()).limit(RECENT_LIMIT)
        return list(db.scalars(query))

    @app.post("/chat", response_model=ChatResponse)
    def chat(body: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
        started = time.perf_counter()
        if body.conversation_id is None:
            conversation = Conversation(title=body.message[:60])
            db.add(conversation)
            db.flush()
        else:
            existing = db.get(Conversation, body.conversation_id)
            if existing is None:
                raise HTTPException(status_code=404, detail="conversation not found")
            conversation = existing

        history = _load_history(db, conversation.id)
        result = agent.invoke(
            {
                "messages": [*history, HumanMessage(content=body.message)],
                "context": [],
                "hits": [],
            }
        )
        reply = str(result["messages"][-1].content)

        db.add(Message(conversation_id=conversation.id, role="user", content=body.message))
        db.add(Message(conversation_id=conversation.id, role="assistant", content=reply))
        sources = _sources(db, result.get("hits", []))
        db.commit()
        return ChatResponse(
            conversation_id=conversation.id,
            reply=reply,
            sources=sources,
            elapsed_ms=round((time.perf_counter() - started) * 1000),
        )

    @app.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
    def list_messages(conversation_id: int, db: Session = Depends(get_db)) -> list[Message]:
        if db.get(Conversation, conversation_id) is None:
            raise HTTPException(status_code=404, detail="conversation not found")
        query = (
            select(Message).where(Message.conversation_id == conversation_id).order_by(Message.id)
        )
        return list(db.scalars(query))

    return app


def _load_history(db: Session, conversation_id: int) -> list[BaseMessage]:
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(HISTORY_LIMIT)
    )
    rows = reversed(list(db.scalars(query)))
    history: list[BaseMessage] = []
    for row in rows:
        if row.role == "user":
            history.append(HumanMessage(content=row.content))
        else:
            history.append(AIMessage(content=row.content))
    return history


def _sources(db: Session, hits: list[Hit]) -> list[SourceOut]:
    titles = {
        row.id: row.title
        for row in db.scalars(
            select(Document).where(Document.id.in_({h.document_id for h in hits if h.document_id}))
        )
    }
    sources: list[SourceOut] = []
    for hit in hits:
        title = titles.get(hit.document_id) if hit.document_id else None
        if title is None:
            continue  # the document was removed or predates the library
        sources.append(
            SourceOut(
                id=f"s{len(sources) + 1}",
                label=f"{title}, part {hit.chunk + 1}",
                document=title,
                excerpt=hit.text,
            )
        )
    return sources
