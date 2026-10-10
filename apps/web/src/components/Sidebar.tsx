import type { Collection } from "../api/types";
import styles from "./Sidebar.module.css";
import { Logo } from "./Logo";

export type Route = "chat" | "library" | "empty";

interface SidebarProps {
  route: Route;
  collections: Collection[];
  recent: string[];
}

export function Sidebar({ route, collections, recent }: SidebarProps) {
  const link = (target: Route, label: string) => (
    <a
      href={`#/${target}`}
      className={styles.link}
      aria-current={route === target ? "page" : undefined}
    >
      {label}
    </a>
  );

  return (
    <aside className={styles.sidebar}>
      <a href="#/chat" className={styles.brand} aria-label="Headnote home">
        <Logo />
      </a>
      <nav aria-label="Main" className={styles.nav}>
        {link("chat", "Ask")}
        {link("library", "Library")}
      </nav>
      <section className={styles.group} aria-labelledby="side-collections">
        <h2 id="side-collections" className={styles.heading}>
          Collections
        </h2>
        {collections.length === 0 ? (
          <p className={styles.none}>No collections yet</p>
        ) : (
          <ul>
            {collections.map((collection) => (
              <li key={collection.id}>
                <a href="#/library" className={styles.row}>
                  <span>{collection.name}</span>
                  <small>{collection.count}</small>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      {recent.length > 0 && (
        <section className={styles.group} aria-labelledby="side-recent">
          <h2 id="side-recent" className={styles.heading}>
            Recent
          </h2>
          <ul>
            {recent.map((item) => (
              <li key={item}>
                <a href="#/chat" className={styles.row}>
                  <span>{item}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav aria-label="Template screens" className={styles.templates}>
        <h2 className={styles.heading}>Template screens</h2>
        <a href="#/chat">Chat</a>
        <a href="#/library">Library</a>
        <a href="#/empty">Empty state</a>
      </nav>
    </aside>
  );
}
