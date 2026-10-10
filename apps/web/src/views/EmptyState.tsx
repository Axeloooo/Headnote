import { useRef, useState, type ChangeEvent } from "react";
import { client } from "../api";
import { Mark } from "../components/Logo";
import styles from "./EmptyState.module.css";

export function EmptyState() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const files = Array.from(target.files ?? []);
    if (files.length === 0) return;
    try {
      const texts = await Promise.all(files.map((file) => file.text()));
      let added = 0;
      // The API accepts at most 100 texts per request.
      for (let start = 0; start < texts.length; start += 100) {
        added += (await client.addDocuments(texts.slice(start, start + 100))).added;
      }
      setStatus(added === 1 ? "Added 1 document." : `Added ${added} documents.`);
    } catch {
      setStatus("The documents could not be added. Check that the API is running, then try again.");
    } finally {
      target.value = "";
    }
  };

  return (
    <div className={styles.view}>
      <div className={styles.card}>
        <Mark size={44} />
        <h1 className={styles.title}>Nothing saved yet</h1>
        <p className={styles.body}>
          Add contracts, emails or notes. Headnote answers from them and shows which document each
          answer came from.
        </p>
        <input
          ref={input}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          multiple
          hidden
          onChange={upload}
          aria-label="Choose text files"
        />
        <button type="button" className="button" onClick={() => input.current?.click()}>
          Add documents
        </button>
        <p className={styles.hint}>Plain text and Markdown files for now.</p>
        {status && (
          <p role="status" className={styles.status}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
