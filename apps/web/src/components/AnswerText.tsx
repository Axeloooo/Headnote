import { useState } from "react";
import type { Answer } from "../api/types";
import styles from "./AnswerText.module.css";
import { SourcePill } from "./SourcePill";

/** Prose with source pills inside the sentence, plus the footer that counts them. */
export function AnswerText({ answer }: { answer: Answer }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(answer.sources.map((source) => [source.id, source]));
  const open = openId ? byId.get(openId) : undefined;
  const used = answer.sources.length;

  return (
    <div className={styles.answer}>
      <p className={styles.prose}>
        {answer.segments.map((segment, index) => {
          if (segment.type === "text") return <span key={index}>{segment.text}</span>;
          const source = byId.get(segment.sourceId);
          if (!source) return null;
          return (
            <SourcePill
              key={index}
              label={source.label}
              expanded={openId === source.id}
              onToggle={() => setOpenId(openId === source.id ? null : source.id)}
            />
          );
        })}
      </p>
      {open && (
        <blockquote className={styles.excerpt}>
          <p>{open.excerpt}</p>
          <footer>{open.document}</footer>
        </blockquote>
      )}
      <div className={styles.foot}>
        <span>
          <b>{used === 1 ? "1 source" : `${used} sources`}</b> used
        </span>
        {answer.conflicts > 0 && (
          <span>
            <b>{answer.conflicts === 1 ? "1 conflict" : `${answer.conflicts} conflicts`}</b> shown
          </span>
        )}
        <span>{(answer.elapsedMs / 1000).toFixed(1)} s</span>
      </div>
    </div>
  );
}
