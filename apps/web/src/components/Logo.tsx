import styles from "./Logo.module.css";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect x="10" y="10" width="44" height="44" rx="10" fill="var(--ink)" />
      <circle cx="42" cy="42" r="6" fill="var(--marker)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className={styles.logo}>
      <Mark />
      <span className={styles.word}>
        headnote<em>.</em>
      </span>
    </span>
  );
}
