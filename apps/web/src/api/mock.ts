import { mockAnswer, mockWorkspace } from "../data/mock";
import type { HeadnoteClient } from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Canned responses so every screen renders without a backend. */
export function createMockClient(latencyMs = 250): HeadnoteClient {
  return {
    async getWorkspace() {
      await delay(latencyMs);
      return structuredClone(mockWorkspace);
    },
    async ask() {
      await delay(latencyMs);
      return structuredClone(mockAnswer);
    },
    async addDocuments(texts) {
      await delay(latencyMs);
      return { added: texts.length };
    },
  };
}
