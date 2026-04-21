import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST || "127.0.0.1";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 3001,
    strictPort: true,
    host,
    hmr: {
      protocol: "ws",
      host,
      port: 1421,
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM
      ? process.env.TAURI_ENV_PLATFORM === "windows"
        ? "chrome105"
        : "safari13"
      : "es2020",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
});
