import styles from "./SourcePill.module.css";

interface SourcePillProps {
  label: string;
  expanded?: boolean;
  onToggle?: () => void;
}

/** A source marker that sits inside a sentence. */
export function SourcePill({ label, expanded = false, onToggle }: SourcePillProps) {
  return (
    <button type="button" className={styles.pill} aria-expanded={expanded} onClick={onToggle}>
      <i className={styles.dot} aria-hidden="true" />
      {label}
    </button>
  );
}
