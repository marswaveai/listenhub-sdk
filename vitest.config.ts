import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      clearMocks: true,
      env: Object.fromEntries(Object.entries(env).filter(([k]) => k.startsWith("LISTENHUB_"))),
    },
  };
});
