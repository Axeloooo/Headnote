import { createHttpClient } from "./http";
import { createMockClient } from "./mock";
import type { HeadnoteClient } from "./types";

export type { HeadnoteClient } from "./types";

/** Mock data by default. Set VITE_CLIENT=http to call apps/api. */
export const client: HeadnoteClient =
  import.meta.env.VITE_CLIENT === "http" ? createHttpClient() : createMockClient();
