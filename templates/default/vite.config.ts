import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs/plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin(), tailwindcss()],
});
