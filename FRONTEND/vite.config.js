import { defineConfig } from "vite";
import vue2 from "@vitejs/plugin-vue2";
import path from "node:path";

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/styles/_variables.scss"; @import "./src/styles/_colors.scss"; @import "./src/styles/_typography.scss"; @import "./src/styles/_spacing.scss";`,
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});