# Deployment

Headnote is two services: the API (`apps/api`, FastAPI, port 8000) and the web app (`apps/web`, static
files). The web app calls the API at `/api` on its own origin by default, so the simplest layouts put a
reverse proxy in front of both.

## One host with Docker Compose

```bash
export ANTHROPIC_API_KEY=...     # optional; without a provider key the API answers with an offline echo model
export ANTHROPIC_MODEL=claude-haiku-5-5   # optional; claude-sonnet-5-5 for stronger answers
docker compose up --build        # web on http://localhost:8080 (set WEB_PORT to change)
```

`web` is nginx serving the built UI and forwarding `/api/*` to `api`. The `headnote-data` volume holds the
SQLite database and the Chroma index (`CHROMA_PATH=/data/chroma`), so documents and conversations survive
restarts. The first request downloads Chroma's local embedding model unless `OPENAI_API_KEY` is set (Anthropic has no embeddings API, so the
local model is used with the Claude chat model).

## Separate hosts

1. Deploy the API image (`apps/api/Dockerfile`; see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for ECS).
   Set `CORS_ORIGINS=https://<web-origin>`.
2. Build the web app with `VITE_API_URL=https://<api-origin>` and publish `apps/web/dist` on any static
   host. On Vercel, set the project root to `apps/web` and add `VITE_API_URL` as an environment variable;
   `vercel.json` handles the SPA fallback.

Alternatively keep the web app same-origin: build it without `VITE_API_URL` and have the host rewrite
`/api/*` to the API with the `/api` prefix stripped.

## Checklist

- `GET /health` on the API returns `{"status":"ok"}`; use it for the load balancer check.
- Use a database that outlives the container (`DATABASE_URL`, PostgreSQL for more than one task) and a
  persistent `CHROMA_PATH`.
- The API has no authentication or rate limiting yet. Put it behind a private network, an auth proxy or
  an allowlist before exposing it publicly.
