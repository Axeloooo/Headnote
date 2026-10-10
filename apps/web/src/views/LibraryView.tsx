import { useMemo, useState } from "react";
import type { Workspace } from "../api/types";
import styles from "./LibraryView.module.css";

const kindLabel = { pdf: "PDF", email: "Email", note: "Note", sheet: "Sheet" } as const;

export function LibraryView({ workspace }: { workspace: Workspace }) {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const names = useMemo(
    () => new Map(workspace.collections.map((collection) => [collection.id, collection.name])),
    [workspace.collections],
  );

  const documents = workspace.documents.filter(
    (document) =>
      (collectionId === null || document.collectionId === collectionId) &&
      document.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>Library</h1>
        <p className={styles.sub}>
          {workspace.documents.length} documents in {workspace.collections.length} collections
        </p>
      </header>

      <div className={styles.tools}>
        <label className="visually-hidden" htmlFor="library-search">
          Search documents
        </label>
        <input
          id="library-search"
          type="search"
          className={styles.search}
          placeholder="Search by title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.filters} role="group" aria-label="Filter by collection">
          <button
            type="button"
            aria-pressed={collectionId === null}
            onClick={() => setCollectionId(null)}
          >
            All
          </button>
          {workspace.collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              aria-pressed={collectionId === collection.id}
              onClick={() => setCollectionId(collection.id)}
            >
              {collection.name}
            </button>
          ))}
        </div>
      </div>

      {documents.length === 0 ? (
        <p className={styles.none}>
          No documents match. Clear the search or pick another collection.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Collection</th>
              <th scope="col">Type</th>
              <th scope="col" className={styles.num}>
                Chunks
              </th>
              <th scope="col">Added</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <th scope="row">{document.title}</th>
                <td>{names.get(document.collectionId)}</td>
                <td>{kindLabel[document.kind]}</td>
                <td className={styles.num}>{document.chunks}</td>
                <td className={styles.mono}>{document.addedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
