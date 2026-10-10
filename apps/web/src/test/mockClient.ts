import type { HeadnoteClient } from "../api/types";
import { mockAnswer, mockQuestion, mockWorkspace } from "./mockData";

/** In-memory client for tests. Production code only ever uses the HTTP client. */
export function createMockClient(overrides: Partial<HeadnoteClient> = {}): HeadnoteClient {
  return {
    async getWorkspace() {
      return structuredClone(mockWorkspace);
    },
    async ask() {
      return structuredClone(mockAnswer);
    },
    async addDocuments(documents) {
      return { added: documents.length };
    },
    async getConversation() {
      return [{ id: "t1", question: mockQuestion, answer: structuredClone(mockAnswer) }];
    },
    ...overrides,
  };
}
