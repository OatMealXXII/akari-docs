import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs/plugin";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
