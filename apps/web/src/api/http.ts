import type {
  Answer,
  Collection,
  DocumentItem,
  HeadnoteClient,
  NewDocument,
  Source,
  Turn,
  Workspace,
} from "./types";

/**
 * Where the API lives. The default `/api` is same-origin: the Vite dev server, the nginx image and
 * `vite preview` all forward it to apps/api. Set `VITE_API_URL` at build time (for example
 * `https://api.example.com`) to call an API on another origin; it must allow this origin in CORS.
 * An empty value (a copied `.env.example`, an unset build arg) also means `/api`.
 */
export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

interface ChatResponse {
  conversation_id: number;
  reply: string;
  sources: { id: string; label: string; document: string; excerpt: string }[];
  elapsed_ms: number;
}

interface DocumentRow {
  id: number;
  title: string;
  collection: string;
  kind: DocumentItem["kind"];
  chunks: number;
  created_at: string;
}

interface MessageRow {
  id: number;
  role: string;
  content: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "content-type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("The API could not be reached.", 0);
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = ` ${body.detail}.`;
    } catch {
      // Not JSON, for example a proxy error page.
    }
    throw new ApiError(`The API answered ${response.status}.${detail}`, response.status);
  }
  return (await response.json()) as T;
}

function toAnswer(data: ChatResponse): Answer {
  const sources: Source[] = data.sources;
  return {
    segments: [
      { type: "text", text: data.reply },
      ...sources.map((source) => ({ type: "source" as const, sourceId: source.id })),
    ],
    sources,
    conflicts: 0,
    elapsedMs: data.elapsed_ms,
    conversationId: String(data.conversation_id),
  };
}

function toWorkspace(rows: DocumentRow[], recent: { id: number; title: string }[]): Workspace {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.collection, (counts.get(row.collection) ?? 0) + 1);
  const collections: Collection[] = [...counts].map(([name, count]) => ({
    id: name,
    name,
    count,
  }));
  return {
    collections,
    documents: rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      collectionId: row.collection,
      kind: row.kind,
      addedAt: row.created_at.slice(0, 10),
      chunks: row.chunks,
    })),
    recent: recent.map((chat) => ({ id: String(chat.id), title: chat.title })),
  };
}

export function createHttpClient(): HeadnoteClient {
  return {
    async getWorkspace() {
      const [rows, recent] = await Promise.all([
        request<DocumentRow[]>("/documents"),
        request<{ id: number; title: string }[]>("/conversations"),
      ]);
      return toWorkspace(rows, recent);
    },
    async ask(question, conversationId) {
      const data = await request<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          conversation_id: conversationId ? Number(conversationId) : null,
        }),
      });
      return toAnswer(data);
    },
    async addDocuments(documents: NewDocument[]) {
      return request<{ added: number }>("/documents", {
        method: "POST",
        body: JSON.stringify({ documents }),
      });
    },
    async getConversation(conversationId) {
      const rows = await request<MessageRow[]>(`/conversations/${conversationId}/messages`);
      const turns: Turn[] = [];
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        if (row.role !== "user") continue;
        const reply = rows[i + 1]?.role === "assistant" ? rows[i + 1].content : "";
        turns.push({
          id: String(row.id),
          question: row.content,
          answer: {
            segments: [{ type: "text", text: reply }],
            sources: [],
            conflicts: 0,
            elapsedMs: 0,
          },
        });
      }
      return turns;
    },
  };
}
