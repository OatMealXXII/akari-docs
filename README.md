# Akari-Docs

Akari-Docs is a zero-bloat Vue + Vite documentation package for markdown-driven sites.

> Notice: I use AI to vibe code in summer.

It provides:

- A Vite markdown plugin (`akariMarkdownPlugin`) that parses frontmatter and headings.
- Typed markdown module output (`default`, `metadata`, `headings`).
- A production-ready `Layout` component with:
  - TOC highlighting
  - page navigator support
  - safe frontmatter fallbacks
- Stable package exports for runtime, plugin-only usage, and CSS.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [How Markdown Files Are Exposed](#how-markdown-files-are-exposed)
- [Package Exports](#package-exports)
- [Plugin Hooks](#plugin-hooks)
- [Layout API](#layout-api)
- [Development](#development)
- [Build and Publish Notes](#build-and-publish-notes)

## Install

```bash
npm install akari-docs
```

`vue` and `vue-router` are peer dependencies.

If your app does not already include them:

```bash
npm install vue vue-router
```

## Quick Start

### 1) Configure Vite

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
```

### 2) Import package styles

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "akari-docs/style.css";

createApp(App).mount("#app");
```

### 3) Render markdown pages with `Layout`

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Layout } from "akari-docs";
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

const currentSlug = ref("introduction");
const currentModule = ref<LoadedMarkdownModule | null>(null);
const router = useRouter();

const pageBySlug = computed(() =>
  Object.fromEntries(markdownIndex.map((item) => [item.slug, item])),
);

const tocItems = computed(() => {
  const page = pageBySlug.value[currentSlug.value];
  return (page?.headings ?? [])
    .filter((h) => h.level >= 2 && h.level <= 3)
    .map((h) => ({ label: h.text, href: `#${h.id}`, level: h.level }));
});

const navigatorItems = computed(() =>
  markdownIndex.map((item) => ({
    label: item.label,
    href: item.href,
    slug: item.slug,
    isActive: item.slug === currentSlug.value,
  })),
);

async function loadPage(slug: string) {
  const target = pageBySlug.value[slug] ? slug : (markdownIndex[0]?.slug ?? "");
  if (!target) return;

  const loader = markdownModules[`./content/${target}.md`];
  if (!loader) return;

  currentModule.value = await loader();
  currentSlug.value = target;
}

function handlePageChange(slug: string) {
  if (!slug || slug === currentSlug.value) return;
  void router.push({ path: `/${slug}` }).catch(() => {
    void loadPage(slug);
  });
}
</script>

<template>
  <Layout
    :frontmatter="currentModule?.metadata"
    :toc-items="tocItems"
    :navigator-items="navigatorItems"
    :current-slug="currentSlug"
    :on-page-change="handlePageChange"
  >
    <component :is="currentModule?.default" v-if="currentModule" />
  </Layout>
</template>
```

## How Markdown Files Are Exposed

With `akariMarkdownPlugin` enabled:

- `*.md` files can be imported as Vue components (`default`).
- Each markdown module also exports:
  - `metadata` (frontmatter key/value pairs)
  - `headings` (heading level/text/id list)
- `virtual:akari-md-index` exports a typed `markdownIndex` for navigation.

## Package Exports

| Import Path            | What You Get                                      |
| ---------------------- | ------------------------------------------------- |
| `akari-docs`           | `Layout`, `akariMarkdownPlugin`, and public types |
| `akari-docs/plugin`    | Plugin-only entry (`akariMarkdownPlugin`)         |
| `akari-docs/style.css` | Stable stylesheet export                          |

## Plugin Hooks

`akariMarkdownPlugin` accepts optional hooks:

- `transform(document)`
- `render(document, next)`
- `transformHtml(html, document)`

Example:

```ts
import { akariMarkdownPlugin } from "akari-docs";

akariMarkdownPlugin({
  hooks: [
    {
      transform(document) {
        return {
          ...document,
          metadata: {
            ...document.metadata,
            source: "docs",
          },
        };
      },
      transformHtml(html) {
        return html.replaceAll("TODO", "");
      },
    },
  ],
});
```

## Layout API

Main props exposed by `Layout`:

- `frontmatter?: FrontmatterData`
- `onPageChange?: (slug: string) => void`
- `tocItems?: readonly TocItem[]`
- `navigatorItems?: readonly NavItem[]`
- `currentSlug?: string`
- `footer?: FooterData`

TOC behavior is optimized for heading levels 2 and 3 and uses active highlighting while scrolling.

## Development

```bash
npm run dev
npm run test
npm run build
npm run preview
```

## Build and Publish Notes

- Build output is published from `dist` only.
- `dist/style.css` is always created for stable CSS export.
- `prepublishOnly` runs test + build before publish.

Example publish flow:

```bash
npm adduser
npm publish --access public
```

## Support

If you find **Akari-Docs** helpful and want to support my work, you can buy me a coffee\! ☕✨

[<b>Ko-Fi<b>](https://ko-fi.com/oatmealxxii) or [<b>Buy me a coffee<b>](https://buymeacoffee.com/oatmealxxii)
