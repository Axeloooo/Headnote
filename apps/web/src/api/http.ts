import type { Answer, HeadnoteClient, Workspace } from "./types";

interface ChatResponse {
  conversation_id: number;
  reply: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

/**
 * Talks to apps/api through the Vite dev proxy (`/api` -> http://localhost:8000).
 *
 * The API returns a plain `reply` string today. Source pills and the library listing
 * need `sources` on /chat and a documents listing endpoint, so until those exist this
 * client returns the reply as one text segment and an empty workspace.
 */
export function createHttpClient(): HeadnoteClient {
  return {
    async getWorkspace(): Promise<Workspace> {
      return { collections: [], documents: [], recent: [] };
    },
    async ask(question, conversationId): Promise<Answer> {
      const started = performance.now();
      const body = JSON.stringify({
        message: question,
        conversation_id: conversationId ? Number(conversationId) : null,
      });
      const data = await request<ChatResponse>("/chat", { method: "POST", body });
      return {
        segments: [{ type: "text", text: data.reply }],
        sources: [],
        conflicts: 0,
        elapsedMs: Math.round(performance.now() - started),
        conversationId: String(data.conversation_id),
      };
    },
    async addDocuments(texts) {
      return request<{ added: number }>("/documents", {
        method: "POST",
        body: JSON.stringify({ texts }),
      });
    },
  };
}
