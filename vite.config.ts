import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import vinext from "vinext"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vinext(),
  ],
  ssr: {
    external: [
      "puppeteer-core",
      "@puppeteer/browsers",
      "semver",
    ],
  },
  optimizeDeps: {
    exclude: [
      "puppeteer-core",
      "@puppeteer/browsers",
      "semver",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
