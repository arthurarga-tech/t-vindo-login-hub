import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon.png", "tavindo-logo.png"],
      manifest: {
        name: "TaVindo Delivery",
        short_name: "TaVindo",
        description: "Sistema de Delivery - TáVindo",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ea580c",
        icons: [
          {
            src: "/tavindo-logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/tavindo-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        // Clean old caches on update
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
