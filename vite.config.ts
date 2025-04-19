import { defineConfig } from "vite";

export default defineConfig({
  base: "/final-fight/",
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html",
        editor: "./editor/editor.html",
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
