import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws when imported outside a React Server Component.
      // Tests import server route/lib modules directly, so no-op it here — the
      // real guard still runs at `next build`.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
