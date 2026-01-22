import { defineConfig } from "vite"
export default defineConfig({
  base: "/Plumeo/",
  build: {
    outDir: "docs",
    emptyOutDir: true
  }
})
