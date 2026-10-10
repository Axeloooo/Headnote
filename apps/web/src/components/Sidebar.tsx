import type { Collection, RecentChat } from "../api/types";
import type { Route } from "../useRoute";
import styles from "./Sidebar.module.css";
import { Logo } from "./Logo";

interface SidebarProps {
  route: Route;
  collections: Collection[];
  recent: RecentChat[];
  libraryFailed?: boolean;
  onNewChat: () => void;
}

export function Sidebar({
  route,
  collections,
  recent,
  libraryFailed = false,
  onNewChat,
}: SidebarProps) {
  const link = (target: Route["name"], label: string) => (
    <a
      href={`#/${target}`}
      className={styles.link}
      aria-current={route.name === target && !route.conversationId ? "page" : undefined}
    >
      {label}
    </a>
  );

  return (
    <aside className={styles.sidebar}>
      <a href="#/chat" className={styles.brand} aria-label="Headnote home">
        <Logo />
      </a>
      <button type="button" className="button button--quiet" onClick={onNewChat}>
        New chat
      </button>
      <nav aria-label="Main" className={styles.nav}>
        {link("chat", "Ask")}
        {link("library", "Library")}
      </nav>
      <section className={styles.group} aria-labelledby="side-collections">
        <h2 id="side-collections" className={styles.heading}>
          Collections
        </h2>
        {libraryFailed ? (
          <p className={styles.none}>Library unavailable</p>
        ) : collections.length === 0 ? (
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
              <li key={item.id}>
                <a
                  href={`#/chat/${item.id}`}
                  className={styles.row}
                  aria-current={route.conversationId === item.id ? "page" : undefined}
                >
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
