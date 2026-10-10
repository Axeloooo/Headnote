import { useCallback, useEffect, useState } from "react";
import { client } from "./api";
import type { Workspace } from "./api/types";
import styles from "./App.module.css";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./views/ChatView";
import { LibraryView } from "./views/LibraryView";
import { useRoute } from "./useRoute";

const emptyWorkspace: Workspace = { collections: [], documents: [], recent: [] };

type Load = "loading" | "ready" | "failed";

export default function App() {
  const route = useRoute();
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [load, setLoad] = useState<Load>("loading");
  const [chatNonce, setChatNonce] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setWorkspace(await client.getWorkspace());
      setLoad("ready");
    } catch {
      setLoad("failed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const newChat = () => {
    window.location.hash = "#/chat";
    setChatNonce((n) => n + 1);
  };

  return (
    <div className={styles.shell}>
      <Sidebar
        route={route}
        collections={workspace.collections}
        recent={workspace.recent}
        libraryFailed={load === "failed"}
        onNewChat={newChat}
      />
      <main className={styles.main}>
        {route.name === "library" ? (
          load === "loading" ? (
            <p className={styles.loading}>Loading your library…</p>
          ) : load === "failed" ? (
            <div role="alert" className={styles.failed}>
              <p>The library could not be loaded. Check that the API is running.</p>
              <button type="button" className="button button--quiet" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          ) : (
            <LibraryView workspace={workspace} onAdded={refresh} />
          )
        ) : (
          <ChatView
            key={`${route.conversationId ?? "new"}-${chatNonce}`}
            conversationId={route.conversationId}
            hasDocuments={workspace.documents.length > 0}
            onAnswered={refresh}
          />
        )}
      </main>
    </div>
  );
}
