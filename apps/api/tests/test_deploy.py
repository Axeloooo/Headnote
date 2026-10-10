from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.config import Settings
from app.models import Base, Document
from app.rag import Retriever
from app.seed import SEED_DIR, seed_library
from tests.test_chat import KeywordEmbedding


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        (
            "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require",
            "postgresql+psycopg://u:p@ep-x.neon.tech/neondb?sslmode=require",
        ),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("sqlite:///./headnote.db", "sqlite:///./headnote.db"),
    ],
)
def test_database_url_uses_the_psycopg_driver(given: str, expected: str) -> None:
    assert Settings(database_url=given).database_url == expected


@pytest.fixture
def session_factory(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path / 'seed.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


def _retriever(name: str) -> Retriever:
    return Retriever(name, embedding_function=KeywordEmbedding())


def test_seed_indexes_bundled_documents(session_factory) -> None:
    retriever = _retriever("seed-fresh")
    expected = len(list(SEED_DIR.glob("*.md")))
    assert expected >= 3
    assert seed_library(session_factory, retriever) == expected
    assert retriever.count() > 0
    assert retriever.search("what is headnote")
    with session_factory() as db:
        assert len(list(db.scalars(select(Document)))) == expected


def test_seed_skips_a_populated_index(session_factory) -> None:
    retriever = _retriever("seed-populated")
    retriever.add_documents(["already here"])
    assert seed_library(session_factory, retriever) == 0
    with session_factory() as db:
        assert list(db.scalars(select(Document))) == []


def test_seed_after_restart_reuses_document_rows(session_factory) -> None:
    first = seed_library(session_factory, _retriever("seed-restart-a"))
    again = seed_library(session_factory, _retriever("seed-restart-b"))
    assert first == again
    with session_factory() as db:
        assert len(list(db.scalars(select(Document)))) == first


def test_app_seeds_the_library_on_startup(tmp_path: Path) -> None:
    from fastapi.testclient import TestClient

    from app.main import create_app

    settings = Settings(database_url=f"sqlite:///{tmp_path / 'app.db'}", seed_demo_documents=True)
    app = create_app(settings=settings, retriever=_retriever("seed-app"))
    with TestClient(app) as client:
        titles = {doc["title"] for doc in client.get("/documents").json()}
    assert "What is Headnote" in titles
