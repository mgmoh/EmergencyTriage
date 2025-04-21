import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./client/src"),
        "@shared": resolve(__dirname, "./shared"),
      },
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
