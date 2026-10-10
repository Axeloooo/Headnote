import { useState, type FormEvent } from "react";
import styles from "./Composer.module.css";

interface ComposerProps {
  onSubmit: (question: string) => Promise<boolean> | void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({
  onSubmit,
  disabled = false,
  placeholder = "Ask about your documents",
}: ComposerProps) {
  const [value, setValue] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const question = value.trim();
    if (!question || disabled) return;
    // Keep the text when the request fails so the question is not lost.
    if ((await onSubmit(question)) !== false) setValue("");
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label className="visually-hidden" htmlFor="question">
        Question
      </label>
      <input
        id="question"
        className={styles.input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={4000}
      />
      <button type="submit" className="button" disabled={disabled || !value.trim()}>
        Ask
      </button>
    </form>
  );
}
