from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Document
from app.rag import Retriever, chunk_text

SEED_DIR = Path(__file__).parent / "demo_docs"
SEED_COLLECTION = "Headnote guide"


def seed_library(
    session_factory: sessionmaker[Session], retriever: Retriever, directory: Path = SEED_DIR
) -> int:
    """Index the Markdown files in `directory` when the retriever is empty; returns how many.

    The Chroma index lives in memory on hosts with an ephemeral disk, so it is empty after every
    restart while the database (which outlives the container) still lists earlier documents. A
    document row with the same title is reused, so restarts do not pile up duplicates.
    """
    if retriever.count() > 0:
        return 0
    seeded = 0
    with session_factory() as db:
        for path in sorted(directory.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            first_line = text.strip().splitlines()[0] if text.strip() else ""
            title = first_line.lstrip("# ").strip()[:200] or path.stem
            chunks = chunk_text(text)
            row = db.scalar(
                select(Document).where(
                    Document.title == title, Document.collection == SEED_COLLECTION
                )
            )
            if row is None:
                row = Document(
                    title=title, collection=SEED_COLLECTION, kind="note", chunks=len(chunks)
                )
                db.add(row)
                db.flush()
            else:
                row.chunks = len(chunks)
            retriever.add_chunks(row.id, chunks)
            seeded += 1
        db.commit()
    return seeded
