import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { akariMarkdownPlugin } from "./src/core/plugins/akari-md-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "lib") {
    return {
      plugins: [tailwindcss(), vue(), akariMarkdownPlugin()],
      build: {
        copyPublicDir: false,
        lib: {
          entry: {
            index: "src/index.ts",
            plugin: "src/plugin.ts",
          },
          name: "AkariDocs",
          formats: ["es"],
          fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
          external: [
            "vue",
            "vue-router",
            "marked",
            "node:fs",
            "node:path",
            "fs",
            "path",
          ],
        },
      },
    };
  }

  return {
    plugins: [tailwindcss(), vue(), akariMarkdownPlugin()],
  };
});
