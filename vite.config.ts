import { defineConfig, searchForWorkspaceRoot } from "vite";
import pkg from "./package.json";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { realpathSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync(path.resolve(__dirname, 'node_modules'))] },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Ясно — облік прибирання',
        short_name: 'Ясно',
        start_url: '/',
        description: 'Застосунок для обліку звітів по прибиранню апартаментів',
        theme_color: '#ffffff',
        background_color: '#fafbfe',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Authenticated API data is cached only by the account-scoped query provider.
        runtimeCaching: [],
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query", "@tanstack/react-query-persist-client"],
          motion: ["motion"],
        },
      },
    },
  },
}));
