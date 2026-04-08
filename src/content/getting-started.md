---
title: Getting Started
author: Akari Team
description: Install, initialize, and wire Akari-Docs into a Vue + Vite app.
order: 2
---

# Getting Started

## Install

```bash
npm install akari-docs
```

`vue` and `vue-router` are peer dependencies.

If your app does not already include them:

```bash
npm install vue vue-router
```

## Starter Template (init)

For the simplest developer experience, use one package with an init command.

```bash
npx akari-docs init my-docs
```

## Quick Start File Map

- Vite plugin setup: `vite.config.ts`
- Global style import and app mount: `src/main.ts`
- Docs page rendering with `Layout`: `src/App.vue`
- Markdown content pages: `src/content/*.md`

## Recommended Project Structure

```text
your-project/
  vite.config.ts
  src/
    main.ts
    App.vue
    content/
      introduction.md
      getting-started.md
      api-reference.md
```

## 1) Configure Vite (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs/plugin";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
```

## 2) Import package styles (`src/main.ts`)

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "akari-docs/style.css";

createApp(App).mount("#app");
```

## 3) Render markdown pages with `Layout` (`src/App.vue`)

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Layout, createDocsRuntime } from "akari-docs/runtime";
import { markdownIndex } from "virtual:akari-md-index";

interface MarkdownHeading {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

interface LoadedMarkdownModule {
  readonly default: unknown;
  readonly metadata: Record<string, string | number | boolean>;
  readonly headings: readonly MarkdownHeading[];
}

const markdownModules = import.meta.glob<LoadedMarkdownModule>(
  "./content/*.md",
);
const router = useRouter();

const docs = createDocsRuntime({
  markdownModules,
  pageIndex: markdownIndex,
  locale: "en",
  initialSlug: "introduction",
});

const currentModule = computed(() => docs.currentModule.value);
const currentSlug = computed(() => docs.currentSlug.value);

function handlePageChange(slug: string): void {
  void docs.onPageChange(slug, async (nextSlug, locale) => {
    await router.push({ path: `/${locale}/${nextSlug}` }).catch(async () => {
      await docs.loadPage(nextSlug, locale);
    });
  });
}
</script>

<template>
  <Layout
    :frontmatter="currentModule?.metadata"
    :toc-items="docs.tocItems"
    :navigator-items="docs.navigatorItems"
    :current-slug="currentSlug"
    :on-page-change="handlePageChange"
  >
    <component :is="currentModule?.default" v-if="currentModule" />
  </Layout>
</template>
```

## Frontmatter + TOC Behavior

- Frontmatter is optional and has safe fallback values in layout rendering.
- TOC is intended for heading levels **2** and **3**.
- Active highlighting updates on scroll and content changes.

## Next Step

Continue with [User Guide](/user-guide) for localization and security defaults.
