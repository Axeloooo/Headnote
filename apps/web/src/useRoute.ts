import { useEffect, useState } from "react";

export type RouteName = "chat" | "library";

export interface Route {
  name: RouteName;
  /** Saved conversation to open, from `#/chat/<id>`. */
  conversationId?: string;
}

function read(): Route {
  const [name, id] = window.location.hash.replace(/^#\//, "").split("/");
  if (name === "library") return { name: "library" };
  return { name: "chat", conversationId: /^\d+$/.test(id ?? "") ? id : undefined };
}

/** Hash routing keeps the app free of a router dependency and works on any static host. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
