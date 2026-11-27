import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        // Same origin as in production: the browser only talks to this server,
        // which forwards API calls to the backend.
        proxy: {
            "/api": process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        },
    },
    esbuild: {
        target: "esnext",
    },

    build: {
        target: "esnext",
    },

    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
        },
    },
});
