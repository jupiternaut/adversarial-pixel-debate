import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"]
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    proxy: {
      "/api": "http://127.0.0.1:48731",
      "/ws": {
        target: "ws://127.0.0.1:48731",
        ws: true
      }
    }
  }
});
