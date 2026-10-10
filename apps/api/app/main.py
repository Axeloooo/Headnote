from collections.abc import Iterator

from fastapi import Depends, FastAPI, HTTPException, Request
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.agent import build_agent
from app.config import Settings, get_settings
from app.llm import get_llm
from app.models import Base, Conversation, Message
from app.rag import Retriever, build_embedding_function
from app.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentsRequest,
    DocumentsResponse,
    MessageOut,
)

HISTORY_LIMIT = 20


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
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    app.state.retriever = retriever

    def get_db(request: Request) -> Iterator[Session]:
        with request.app.state.session_factory() as session:
            yield session

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/documents", response_model=DocumentsResponse)
    def add_documents(body: DocumentsRequest) -> DocumentsResponse:
        return DocumentsResponse(added=retriever.add_documents(body.texts))

    @app.post("/chat", response_model=ChatResponse)
    def chat(body: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
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
            {"messages": [*history, HumanMessage(content=body.message)], "context": []}
        )
        reply = str(result["messages"][-1].content)

        db.add(Message(conversation_id=conversation.id, role="user", content=body.message))
        db.add(Message(conversation_id=conversation.id, role="assistant", content=reply))
        db.commit()
        return ChatResponse(conversation_id=conversation.id, reply=reply)

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
