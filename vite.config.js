import { defineConfig } from "vite"

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/Plumeo/",
  build: {
    outDir: "docs",
    emptyOutDir: true
  }
}))
