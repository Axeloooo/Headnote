# Headnote web

React and TypeScript UI for Headnote, the chat agent. Design tokens come from the C-A spread of the
brand directions (white page, Geist, one amber marker).

Screens, all backed by `apps/api`:

- **Ask** (`#/chat`): chat with source pills inside the sentence. Each pill opens the excerpt it came
  from. `#/chat/<id>` reopens a saved conversation; the sidebar lists recent ones.
- **Library** (`#/library`): saved documents with search, collection filters and file upload. An empty
  library shows an invitation to add documents.

Every screen has loading, error (with retry) and empty states.

## Run

```bash
cd apps/web
npm install
npm run dev          # http://localhost:5173, forwards /api to http://localhost:8000
npm test
npm run build
```

Start `apps/api` first (see the root README). `npm run preview` serves the production build with the
same `/api` forwarding.

## Configuration

| Variable           | When       | Default                  | Purpose                                                                     |
| ------------------ | ---------- | ------------------------ | --------------------------------------------------------------------------- |
| `VITE_API_URL`     | build time | empty (same-origin /api) | API origin for a cross-origin deploy, for example `https://api.example.com` |
| `API_PROXY_TARGET` | dev        | `http://localhost:8000`  | Where `vite` and `vite preview` forward `/api`                              |

`VITE_API_URL` is baked into the bundle, so set it when building. When it is set, add the site's
origin to the API's `CORS_ORIGINS`.

## Deploy

- **Docker (recommended).** `docker build -t headnote-web apps/web`, then run it with
  `API_UPSTREAM=http://<api-host>:8000`. nginx serves the SPA, falls back to `index.html`, caches hashed
  assets and forwards `/api/*` to the API, so no CORS setup is needed. `docker compose up --build` at the
  repo root runs web and API together.
- **Static host (Vercel, Netlify, S3 and CloudFront).** Build with `VITE_API_URL=https://<api-host>`
  and publish `dist/`. `vercel.json` already sets the SPA fallback. Add the site's origin to the API's
  `CORS_ORIGINS`.

## Layout

- `src/styles/tokens.css`: palette, type and spacing tokens. Components use CSS modules and only read
  these variables.
- `src/components/`: `Logo`, `SourcePill`, `AnswerText`, `Composer`, `Sidebar`, `AddDocuments`.
- `src/views/`: `ChatView`, `LibraryView`, `LibraryEmpty`.
- `src/api/`: the only place that reaches the API. `HeadnoteClient` in `types.ts` is the contract and
  `http.ts` implements it.
- `src/test/`: in-memory client and fixtures used by tests only. They are not part of the bundle.
