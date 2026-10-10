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
cp .env.example .env            # optional: add ANTHROPIC_API_KEY
uvicorn app.main:create_app --factory --reload
```

Build the container with `docker build -t headnote apps/api`.

Set `ANTHROPIC_API_KEY` for Claude answers (default model `claude-haiku-5-5`; set `ANTHROPIC_MODEL=claude-sonnet-5-5` for Sonnet). `OPENAI_API_KEY` still works as an alternative. Without a key the app uses an offline echo model, so everything still runs end to end.

## API

| Method | Path                           | Purpose                                                     |
| ------ | ------------------------------ | ----------------------------------------------------------- |
| GET    | `/health`                      | Liveness check                                              |
| GET    | `/documents`                   | List saved documents                                        |
| POST   | `/documents`                   | Save documents (`documents` with titles, or bare `texts`)   |
| GET    | `/conversations`               | Recent conversations, newest first                          |
| POST   | `/chat`                        | Send a message; returns `reply`, `sources` and `elapsed_ms` |
| GET    | `/conversations/{id}/messages` | Read a conversation's history                               |

```bash
curl -X POST localhost:8000/documents -H 'content-type: application/json' \
  -d '{"texts": ["Headnote keeps conversations in SQLite by default."]}'
curl -X POST localhost:8000/chat -H 'content-type: application/json' \
  -d '{"message": "Where are conversations kept?"}'
```

## Web UI

The UI lives in `apps/web` (Vite, React, TypeScript). Every screen reads from `apps/api`: chat with
source pills taken from the retrieved documents, a library of saved documents with upload, and saved
conversations in the sidebar. See [apps/web/README.md](apps/web/README.md).

```bash
cd apps/api && uvicorn app.main:create_app --factory --reload   # terminal 1, port 8000
cd apps/web && npm install && npm run dev                       # terminal 2, http://localhost:5173
```

## Deploy

The whole stack runs from one command, and the pieces also deploy separately. Details and
alternatives are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). For a free hosted demo (Vercel, Render and
Neon, no card) follow the click-by-click checklist in
[Free hosting](docs/DEPLOYMENT.md#free-hosting-vercel-render-and-neon).

```bash
docker compose up --build        # http://localhost:8080
```

| Variable              | Where      | When       | Purpose                                                              |
| --------------------- | ---------- | ---------- | -------------------------------------------------------------------- |
| `VITE_API_URL`        | `apps/web` | build time | API origin for a cross-origin deploy. Empty means same-origin `/api` |
| `API_UPSTREAM`        | web image  | start      | Where nginx forwards `/api` (default `http://api:8000`)              |
| `API_PROXY_TARGET`    | `apps/web` | dev        | Where `vite` and `vite preview` forward `/api`                       |
| `CORS_ORIGINS`        | `apps/api` | start      | Comma-separated origins allowed to call the API cross-origin         |
| `ANTHROPIC_API_KEY`   | `apps/api` | start      | Claude chat model. Empty falls back to OpenAI, then the echo model   |
| `ANTHROPIC_MODEL`     | `apps/api` | start      | Claude model name. Default `claude-haiku-5-5`                        |
| `LLM_PROVIDER`        | `apps/api` | start      | `auto` (default), `anthropic`, `openai` or `echo`                    |
| `OPENAI_API_KEY`      | `apps/api` | start      | OpenAI chat model and embeddings. Optional                           |
| `DATABASE_URL`        | `apps/api` | start      | SQLAlchemy URL, or a Postgres string as given (Neon). Default SQLite |
| `SEED_DEMO_DOCUMENTS` | `apps/api` | start      | `true` indexes the sample documents when the index is empty          |
| `CHROMA_PATH`         | `apps/api` | start      | Directory for the persistent Chroma index. Empty keeps it in memory  |

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
