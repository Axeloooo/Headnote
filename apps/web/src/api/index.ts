import { createHttpClient } from "./http";
import type { HeadnoteClient } from "./types";

export type { HeadnoteClient } from "./types";

export const client: HeadnoteClient = createHttpClient();
