import { defineConfig } from "vite";
export default defineConfig({
  base: "/studio-assets/",
  publicDir: false,
  build: {
    outDir: "public/studio-assets",
    emptyOutDir: true,
    manifest: "manifest.json",
    rollupOptions: { input: "studio/main.tsx" },
  },
});
