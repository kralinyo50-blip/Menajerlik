import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createOnlineApi } from "./server/online.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), {
    name: "online-league-api",
    configureServer(server) {
      const api = createOnlineApi();
      server.middlewares.use(api);
      server.httpServer?.once('close', api.close);
    },
    configurePreviewServer(server) {
      const api = createOnlineApi();
      server.middlewares.use(api);
      server.httpServer.once('close', api.close);
    },
  }],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // singlefile zaten her şeyi inline ediyor — modulepreload linkleri gereksiz ve console warning üretiyor
    modulePreload: false,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
