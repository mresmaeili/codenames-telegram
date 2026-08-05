import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
var appRoot = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig({
    envDir: path.resolve(appRoot),
    server: {
        host: "0.0.0.0",
        port: 5173,
        allowedHosts: ["app.radwebstudio.ir"],
    },
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
