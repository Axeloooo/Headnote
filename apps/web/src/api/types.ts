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

export interface RecentChat {
  id: string;
  title: string;
}

export interface Workspace {
  collections: Collection[];
  documents: DocumentItem[];
  recent: RecentChat[];
}

export interface NewDocument {
  title: string;
  text: string;
  collection: string;
  kind: DocumentItem["kind"];
}

/**
 * The only surface the UI uses to reach the API. Components never call fetch directly.
 */
export interface HeadnoteClient {
  getWorkspace(): Promise<Workspace>;
  ask(question: string, conversationId?: string): Promise<Answer>;
  addDocuments(documents: NewDocument[]): Promise<{ added: number }>;
  /** Earlier turns of a saved conversation, oldest first. */
  getConversation(conversationId: string): Promise<Turn[]>;
}
