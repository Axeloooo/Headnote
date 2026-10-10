import { useRef, useState, type ChangeEvent } from "react";
import { client } from "../api";
import type { NewDocument } from "../api/types";
import styles from "./AddDocuments.module.css";

const kinds: Record<string, NewDocument["kind"]> = { csv: "sheet", eml: "email" };

export function toDocument(file: File, text: string, collection: string): NewDocument {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return {
    title: file.name.replace(/\.[^.]+$/, "") || file.name,
    text,
    collection,
    kind: kinds[extension] ?? "note",
  };
}

/** Picks text files and saves them to the library under one collection name. */
export function AddDocuments({ onAdded }: { onAdded: () => void | Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [collection, setCollection] = useState("General");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const files = Array.from(target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const name = collection.trim() || "General";
      const documents = await Promise.all(
        files.map(async (file) => toDocument(file, await file.text(), name)),
      );
      let added = 0;
      // The API accepts at most 100 documents per request.
      for (let start = 0; start < documents.length; start += 100) {
        added += (await client.addDocuments(documents.slice(start, start + 100))).added;
      }
      setStatus({
        ok: true,
        text: added === 1 ? "Added 1 document." : `Added ${added} documents.`,
      });
      await onAdded();
    } catch (cause) {
      const reason = cause instanceof Error ? ` ${cause.message}` : "";
      setStatus({ ok: false, text: `The documents could not be added.${reason}` });
    } finally {
      setBusy(false);
      target.value = "";
    }
  };

  return (
    <div className={styles.add}>
      <div className={styles.row}>
        <label className="visually-hidden" htmlFor="add-collection">
          Collection
        </label>
        <input
          id="add-collection"
          className={styles.collection}
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
          maxLength={80}
          placeholder="Collection"
        />
        <input
          ref={input}
          type="file"
          accept=".txt,.md,.csv,.eml,text/plain,text/markdown,text/csv"
          multiple
          hidden
          onChange={upload}
          aria-label="Choose text files"
        />
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Adding…" : "Add documents"}
        </button>
      </div>
      <p className={styles.hint}>Plain text, Markdown, CSV and .eml files.</p>
      {status && (
        <p role={status.ok ? "status" : "alert"} className={status.ok ? styles.ok : styles.error}>
          {status.text}
        </p>
      )}
    </div>
  );
}
