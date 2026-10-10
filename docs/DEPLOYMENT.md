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

## Free hosting: Vercel, Render and Neon

No card and no domain needed: the web app on Vercel Hobby, the API on Render Free and the database on Neon
Free. Claude prepared the repo side (`render.yaml`, `apps/web/vercel.json`, Postgres support, a sample
library seeded at startup); the account steps below are yours.

### What you do

1. **Neon.** Create a project named `headnote`, then copy its connection string
   (`postgresql://...neon.tech/neondb?sslmode=require`). Paste it as is; the API switches it to the
   psycopg driver itself.
2. **Render.** Install the Render GitHub app on this repo, then _New > Blueprint_ and pick the repo. It reads
   `render.yaml` and creates the `headnote-api` service (Docker, free plan, health check `/health`). When it
   asks for the secret values, paste:
   - `DATABASE_URL`: the Neon string from step 1
   - `ANTHROPIC_API_KEY`: your key (set a monthly spend cap in the Anthropic console first)
   - `LANGSMITH_API_KEY`: optional; also set `LANGSMITH_TRACING=true`
3. **Vercel.** Install the Vercel GitHub app on this repo, _Add New > Project_, pick the repo and set the
   _Root Directory_ to `apps/web`. The framework, build command and output directory come from `vercel.json`.
   Add no environment variables: `VITE_*` values are public.
4. **Check the API address.** Render names the service `https://headnote-api.onrender.com` unless that is
   taken. If yours differs, edit the `destination` of the `/api/:path*` rewrite in `apps/web/vercel.json`
   and push.
5. **Deploy from `main`.** Render and Vercel both track `main`, so a release is the deploy.

Open the Vercel URL; the first request after a quiet spell takes about a minute while Render wakes up.

### How it fits together

- `vercel.json` rewrites `/api/*` to the Render service with the prefix stripped, so the browser only talks
  to one origin and no CORS setup is needed. If you would rather call Render directly, build the web app with
  `VITE_API_URL=https://headnote-api.onrender.com` and set `CORS_ORIGINS=https://<your-app>.vercel.app` on
  Render. Use this route if long chat answers hit Vercel's proxy timeout.
- Render's free disk is wiped whenever the service sleeps, so the Chroma index is rebuilt in memory at
  every start from the sample documents in `apps/api/app/demo_docs` (`SEED_DEMO_DOCUMENTS=true`).
  Documents added through the UI vanish from search after a restart, although their rows stay in Neon;
  conversations persist.
- Anthropic has no embeddings API, so search uses Chroma's local ONNX model. The Dockerfile downloads it at
  build time. If the free 512 MB instance runs out of memory, set `OPENAI_API_KEY` to use OpenAI embeddings
  instead.
- Render sets `PORT`; the image listens on it and falls back to 8000.
- Never add a card to Neon or Render: the free tiers cannot bill you. The Anthropic key is the one paid
  line, so keep the spend cap on.

## Checklist

- `GET /health` on the API returns `{"status":"ok"}`; use it for the load balancer check.
- Use a database that outlives the container (`DATABASE_URL`, PostgreSQL for more than one task) and a
  persistent `CHROMA_PATH`.
- The API has no authentication or rate limiting yet. Put it behind a private network, an auth proxy or
  an allowlist before exposing it publicly.
