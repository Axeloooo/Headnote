import { useEffect, useState } from "react";
import type { Route } from "./components/Sidebar";

const routes: Route[] = ["chat", "library", "empty"];

function read(): Route {
  const name = window.location.hash.replace(/^#\//, "");
  return routes.find((route) => route === name) ?? "chat";
}

/** Hash routing keeps the template free of a router dependency. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
