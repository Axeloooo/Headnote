export interface Source {
  id: string;
  /** Short label shown in the pill, for example "Contract Q3, p.14". */
  label: string;
  document: string;
  excerpt: string;
}

/** An answer is prose with source pills placed inside the sentence. */
export type AnswerSegment = { type: "text"; text: string } | { type: "source"; sourceId: string };

export interface Answer {
  segments: AnswerSegment[];
  sources: Source[];
  /** Sources that disagree with each other. */
  conflicts: number;
  elapsedMs: number;
  /** Set by backends that keep history; pass it to the next `ask`. */
  conversationId?: string;
}

export interface Turn {
  id: string;
  question: string;
  answer: Answer;
}

export interface Collection {
  id: string;
  name: string;
  count: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  collectionId: string;
  kind: "pdf" | "email" | "note" | "sheet";
  addedAt: string;
  chunks: number;
}

export interface Workspace {
  collections: Collection[];
  documents: DocumentItem[];
  recent: string[];
}

/**
 * The only surface the UI uses to reach a backend. Swap the implementation in
 * `src/api/index.ts`; components never import fetch or mock data directly.
 */
export interface HeadnoteClient {
  getWorkspace(): Promise<Workspace>;
  ask(question: string, conversationId?: string): Promise<Answer>;
  addDocuments(texts: string[]): Promise<{ added: number }>;
}
