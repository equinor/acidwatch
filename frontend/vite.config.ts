import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    esbuild: {
        target: "esnext",
    },
    server: {
        proxy: {
            "/oasis": {
                target: "https://api-oasis-prod.radix.equinor.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/oasis/, ""),
            },
        },
    },
    build: {
        target: "esnext",
    },
});
