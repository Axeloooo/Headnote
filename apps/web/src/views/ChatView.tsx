import { useState } from "react";
import { client } from "../api";
import type { Turn } from "../api/types";
import { AnswerText } from "../components/AnswerText";
import { Composer } from "../components/Composer";
import { mockAnswer, mockQuestion } from "../data/mock";
import styles from "./ChatView.module.css";

/** Starts with one finished turn so the template shows the sources-in-sentence layout. */
const seedTurn: Turn = { id: "seed", question: mockQuestion, answer: mockAnswer };

export function ChatView({ seed = import.meta.env.VITE_CLIENT !== "http" }: { seed?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>(seed ? [seedTurn] : []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const ask = async (question: string): Promise<boolean> => {
    setError(null);
    setPending(question);
    try {
      const answer = await client.ask(question, conversationId);
      if (answer.conversationId) setConversationId(answer.conversationId);
      setTurns((current) => [...current, { id: crypto.randomUUID(), question, answer }]);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The question could not be sent.");
      return false;
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={styles.view}>
      <div className={styles.thread} role="log" aria-live="polite" aria-label="Conversation">
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
        <Composer onSubmit={ask} disabled={pending !== null} />
      </div>
    </div>
  );
}
