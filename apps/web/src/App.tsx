import { useEffect, useState } from "react";
import { client } from "./api";
import type { Workspace } from "./api/types";
import styles from "./App.module.css";
import { Sidebar } from "./components/Sidebar";
import { EmptyState } from "./views/EmptyState";
import { ChatView } from "./views/ChatView";
import { LibraryView } from "./views/LibraryView";
import { useRoute } from "./useRoute";

const emptyWorkspace: Workspace = { collections: [], documents: [], recent: [] };

export default function App() {
  const route = useRoute();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    client.getWorkspace().then(setWorkspace, () => setFailed(true));
  }, []);

  const shown = route === "empty" ? emptyWorkspace : (workspace ?? emptyWorkspace);

  return (
    <div className={styles.shell}>
      <Sidebar route={route} collections={shown.collections} recent={shown.recent} />
      <main className={styles.main}>
        {failed ? (
          <p role="alert" className={styles.failed}>
            The library could not be loaded. Check that the API is running, then reload.
          </p>
        ) : route === "empty" ? (
          <EmptyState />
        ) : !workspace ? (
          <p className={styles.loading}>Loading your library…</p>
        ) : route === "library" ? (
          <LibraryView workspace={workspace} />
        ) : (
          <ChatView />
        )}
      </main>
    </div>
  );
}
