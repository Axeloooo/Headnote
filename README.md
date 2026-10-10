# Headnote

A ChatGPT-style agent built with LangGraph, FastAPI, LangSmith, ChromaDB and SQLAlchemy.
Based on the "Build Your Own ChatGPT Agent" project from YouTube video `Zy7EXDONlTY`.

## Stack

- **FastAPI** for the HTTP API (`apps/api/app/main.py`)
- **LangGraph** agent: retrieve from Chroma, then respond with the LLM (`apps/api/app/agent.py`)
- **ChromaDB** knowledge base (`apps/api/app/rag.py`)
- **SQLAlchemy** storage for conversations and messages (`apps/api/app/models.py`)
- **LangSmith** tracing, enabled through environment variables

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
cd apps/api
pip install -r requirements.txt
cp .env.example .env            # optional: add OPENAI_API_KEY
uvicorn app.main:create_app --factory --reload
```

Build the container with `docker build -t headnote apps/api`.

Without `OPENAI_API_KEY` the app uses an offline echo model, so everything still runs end to end.

## API

| Method | Path                           | Purpose                                                            |
| ------ | ------------------------------ | ------------------------------------------------------------------ |
| GET    | `/health`                      | Liveness check                                                     |
| POST   | `/documents`                   | Add texts to the Chroma knowledge base                             |
| POST   | `/chat`                        | Send a message; omit `conversation_id` to start a new conversation |
| GET    | `/conversations/{id}/messages` | Read a conversation's history                                      |

```bash
curl -X POST localhost:8000/documents -H 'content-type: application/json' \
  -d '{"texts": ["Headnote keeps conversations in SQLite by default."]}'
curl -X POST localhost:8000/chat -H 'content-type: application/json' \
  -d '{"message": "Where are conversations kept?"}'
```

## Web UI

The UI lives in `apps/web` (Vite, React, TypeScript) under the product name Headnote. It runs on mock data until the API exposes sources and a document listing. See [apps/web/README.md](apps/web/README.md).

## Tests

```bash
cd apps/api
pytest
```

Tests use a file-based SQLite database and a deterministic embedding function, so they make no network calls.

## Upgrading from the Cairnly name

The project was renamed from Cairnly to Headnote. The default SQLite file is now `headnote.db` and the
default Chroma collection is `headnote_docs`, so an existing local `cairnly.db` or `cairnly_docs`
collection is no longer picked up. Keep your data by renaming `cairnly.db` to `headnote.db`, or by
setting `DATABASE_URL` and `CHROMA_COLLECTION` to the old values in `.env`. The LangSmith project name
and the Docker and ECR image names also changed to `headnote`.

## LangSmith tracing

Set these in `.env` and every agent run is traced:

```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=headnote
```

## AWS deployment

See [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md).
