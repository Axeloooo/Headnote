import { useEffect, useState } from "react";
import { client } from "../api";
import type { Turn } from "../api/types";
import { AnswerText } from "../components/AnswerText";
import { Composer } from "../components/Composer";
import styles from "./ChatView.module.css";

interface ChatViewProps {
  /** Open a saved conversation; omit to start a new one. */
  conversationId?: string;
  hasDocuments: boolean;
  /** Called after each answer so the sidebar's recent list stays current. */
  onAnswered?: () => void;
}

export function ChatView({ conversationId: initialId, hasDocuments, onAnswered }: ChatViewProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialId !== undefined);
  const [conversationId, setConversationId] = useState<string | undefined>(initialId);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (initialId === undefined) return;
    let current = true;
    setLoading(true);
    setLoadError(null);
    client.getConversation(initialId).then(
      (loaded) => {
        if (!current) return;
        setTurns(loaded);
        setLoading(false);
      },
      (cause: unknown) => {
        if (!current) return;
        setLoadError(cause instanceof Error ? cause.message : "The conversation could not load.");
        setLoading(false);
      },
    );
    return () => {
      current = false;
    };
  }, [initialId, reloads]);

  const ask = async (question: string): Promise<boolean> => {
    setError(null);
    setPending(question);
    try {
      const answer = await client.ask(question, conversationId);
      if (answer.conversationId) setConversationId(answer.conversationId);
      setTurns((current) => [...current, { id: crypto.randomUUID(), question, answer }]);
      onAnswered?.();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The question could not be sent.");
      return false;
    } finally {
      setPending(null);
    }
  };

  const idle = !loading && !loadError && turns.length === 0 && pending === null;

  return (
    <div className={styles.view}>
      <div className={styles.thread} role="log" aria-live="polite" aria-label="Conversation">
        {loading && <p className={styles.working}>Loading the conversation…</p>}
        {loadError && (
          <div role="alert" className={styles.error}>
            <p>{loadError}</p>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => setReloads((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {idle && (
          <div className={styles.idle}>
            <h1 className={styles.idleTitle}>Ask about your documents</h1>
            <p>
              {hasDocuments
                ? "Answers cite the documents they came from."
                : "Your library is empty, so answers will not cite anything yet."}
              {!hasDocuments && (
                <>
                  {" "}
                  <a href="#/library">Add documents</a>
                </>
              )}
            </p>
          </div>
        )}
        {turns.map((turn) => (
          <article key={turn.id} className={styles.turn}>
            <h2 className={styles.question}>{turn.question}</h2>
            <AnswerText answer={turn.answer} />
          </article>
        ))}
        {pending && (
          <article className={styles.turn} aria-busy="true">
            <h2 className={styles.question}>{pending}</h2>
            <p className={styles.working}>Reading your documents…</p>
          </article>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error} Check that the API is running, then ask again.
          </p>
        )}
      </div>
      <div className={styles.composer}>
        <Composer onSubmit={ask} disabled={pending !== null || loading} />
      </div>
    </div>
  );
}
