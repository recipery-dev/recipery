import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirrors tsconfig.json's "@/*" -> "./src/*" path alias — Next.js resolves
// that on its own, but Vitest needs it spelled out since it doesn't read
// tsconfig `paths`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
