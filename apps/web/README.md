# Headnote web

React and TypeScript UI for Headnote, the chat agent.

This is a set of template screens on mock data: chat with source pills inside the sentence, a
document library, and an empty state. Design tokens come from the C-A spread of the brand
directions (white page, Geist, one amber marker).

## Run

```bash
cd apps/web
npm install
npm run dev          # http://localhost:5173
npm test
npm run build
```

Screens are reachable from the sidebar or by hash: `#/chat`, `#/library`, `#/empty`.

## Layout

- `src/styles/tokens.css`: palette, type and spacing tokens. Components use CSS modules and only
  read these variables.
- `src/components/`: `Logo`, `SourcePill`, `AnswerText`, `Composer`, `Sidebar`.
- `src/views/`: `ChatView`, `LibraryView`, `EmptyState`.
- `src/api/`: the only place that reaches a backend. `HeadnoteClient` in `types.ts` is the
  contract; `mock.ts` serves canned data and `http.ts` calls `apps/api`.
- `src/data/mock.ts`: mock workspace and answer.

## Wiring to the API

The client defaults to mock data. To call `apps/api`, run it on port 8000 and start the UI with
`VITE_CLIENT=http npm run dev`; the dev server proxies `/api` to `http://localhost:8000`.

`/chat` returns a plain `reply` today, so the HTTP client shows it as one text segment. Source
pills and the library need `sources` on the chat response and a documents listing endpoint in
`apps/api`. Extend `http.ts` when those exist; no component changes are needed.
