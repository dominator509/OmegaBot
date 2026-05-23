import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "25662";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8080";
const apiProxy = {
  target: apiOrigin,
  changeOrigin: true,
};

function manualChunks(id: string) {
  const normalizedId = id.replace(/\\/g, "/");

  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  if (
    normalizedId.includes("/node_modules/@radix-ui/")
    || normalizedId.includes("/node_modules/class-variance-authority/")
    || normalizedId.includes("/node_modules/cmdk/")
    || normalizedId.includes("/node_modules/vaul/")
    || normalizedId.includes("/node_modules/react-day-picker/")
    || normalizedId.includes("/node_modules/react-hook-form/")
    || normalizedId.includes("/node_modules/react-resizable-panels/")
  ) {
    return "ui-vendor";
  }

  if (normalizedId.includes("/node_modules/lucide-react/") || normalizedId.includes("/node_modules/react-icons/")) {
    return "icons-vendor";
  }

  if (
    normalizedId.includes("/node_modules/recharts/")
    || normalizedId.includes("/node_modules/d3-")
    || normalizedId.includes("/node_modules/victory-vendor/")
  ) {
    return "charts-vendor";
  }

  if (normalizedId.includes("/node_modules/@tanstack/")) {
    return "query-vendor";
  }

  if (
    normalizedId.includes("/node_modules/framer-motion/")
    || normalizedId.includes("/node_modules/date-fns/")
    || normalizedId.includes("/node_modules/wouter/")
  ) {
    return "app-vendor";
  }

  if (
    normalizedId.includes("/node_modules/react/")
    || normalizedId.includes("/node_modules/react-dom/")
    || normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "react-vendor";
  }

  return "vendor";
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": apiProxy,
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": apiProxy,
    },
  },
});
