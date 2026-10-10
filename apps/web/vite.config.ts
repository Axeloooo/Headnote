/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Same-origin calls to apps/api for `vite` and `vite preview`, see src/api/http.ts.
// Point API_PROXY_TARGET elsewhere to develop against a remote API.
const proxy = {
  "/api": {
    target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
