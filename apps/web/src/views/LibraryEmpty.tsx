import { AddDocuments } from "../components/AddDocuments";
import { Mark } from "../components/Logo";
import styles from "./LibraryEmpty.module.css";

export function LibraryEmpty({ onAdded }: { onAdded: () => void | Promise<void> }) {
  return (
    <div className={styles.view}>
      <div className={styles.card}>
        <Mark size={44} />
        <h1 className={styles.title}>Nothing saved yet</h1>
        <p className={styles.body}>
          Add contracts, emails or notes. Headnote answers from them and shows which document each
          answer came from.
        </p>
        <AddDocuments onAdded={onAdded} />
      </div>
    </div>
  );
}
