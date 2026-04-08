# Akari-Docs

Build Vue documentation sites that feel production-ready on day one, without building a docs framework from scratch.

Akari-Docs is a zero-bloat Vue + Vite package for markdown-driven docs with a typed content pipeline, stable exports, and a practical layout you can ship.

**One-line comparison:** If a typical docs setup gives you raw markdown rendering and leaves the rest to custom glue code, Akari-Docs gives you typed content, navigation indexing, and a production-ready layout out of the box.

## Why Teams Use Akari-Docs

Most markdown docs setups fail in the same places:

- You spend time wiring markdown parsing, frontmatter, and heading extraction before writing real content.
- TOC behavior is inconsistent (wrong active state, flicker, broken deep links).
- Navigation metadata is duplicated across files and hand-maintained.
- Packaging gets messy (`style.css` path changes, plugin/runtime split, fragile exports).

Akari-Docs fixes those pain points with a focused API:

- Parse markdown into typed module exports (`default`, `metadata`, `headings`).
- Generate a typed docs index through `virtual:akari-md-index`.
- Use a production-ready `Layout` with TOC highlighting and page navigation support.
- Rely on stable package exports for runtime, plugin-only usage, and stylesheet import.

## What You Get

- `akariMarkdownPlugin`: a Vite plugin for markdown transformation and indexing.
- Typed markdown output: predictable module shape across your docs pages.
- `Layout`: a drop-in docs layout with robust heading tracking (optimized for `h2` and `h3`).
- Stable exports:
  - `akari-docs/runtime`
  - `akari-docs/plugin`
  - `akari-docs/style.css`
  - `akari-docs` (legacy combined entry)

## Social Proof (Placeholders)

Use this section for npm and GitHub conversion. Replace placeholders with your real numbers.

<!-- ### Benchmarks

| Metric                                   | Akari-Docs   | Typical Custom Setup |
| ---------------------------------------- | ------------ | -------------------- |
| Time to first publishable docs page      | `<XX min>`   | `<YY min>`           |
| Markdown integration code to maintain    | `<AA lines>` | `<BB lines>`         |
| TOC/navigation bugs found in first month | `<N>`        | `<M>`                |

### Adopters

- Trusted by: `<Team A>`, `<Team B>`, `<Open-source Project C>`
- Production use cases: `<Internal docs>`, `<SDK docs>`, `<Product docs portal>` -->

### GitHub and npm CTA

- If this saves your team time, please star the repo to help more teams discover it.
- Try it in one page first: install, import `akari-docs/style.css`, and render one markdown file with `Layout`.

## When Not to Use Akari-Docs

Akari-Docs is intentionally focused. You may not need it if:

- You are building a docs site outside the Vue + Vite ecosystem.
- You need a fully managed docs platform with hosted search, analytics, and CMS workflows included.
- Your docs are static enough that a plain markdown renderer with no TOC/nav logic is already sufficient.

If these do not apply, Akari-Docs is a strong fit when you want speed, control, and predictable outputs.

## Table of Contents

- [Social Proof (Placeholders)](#social-proof-placeholders)
- [When Not to Use Akari-Docs](#when-not-to-use-akari-docs)
- [Install](#install)
- [Starter Template (init)](#starter-template-init)
- [Quick Start](#quick-start)
- [Quick Start File Map](#quick-start-file-map)
- [Recommended Project Structure](#recommended-project-structure)
- [Localization (Markdown Content i18n)](#localization-markdown-content-i18n)
- [Security Defaults](#security-defaults)
- [How Markdown Files Are Exposed](#how-markdown-files-are-exposed)
- [Package Exports](#package-exports)
- [Plugin Hooks](#plugin-hooks)
- [Layout API](#layout-api)
- [Development](#development)
- [Build and Publish Notes](#build-and-publish-notes)

## Install

<b>`** Requires Node.js 24+ for optimal performance.`</b>

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

This scaffolds a starter project based on the current preview architecture.

For local testing in this repository:

```bash
npm run init:starter:local
```

## Quick Start

Follow this sequence to wire Akari-Docs into a standard Vue + Vite project.

## Quick Start File Map

- Vite plugin setup: `vite.config.ts`
- Global style import and app mount: `src/main.ts`
- Docs page rendering with `Layout`: `src/App.vue`
- Markdown content files: `src/content/*.md`

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

### 1) Configure Vite (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs/plugin";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
```

### 2) Import package styles (`src/main.ts`)

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "akari-docs/style.css";

createApp(App).mount("#app");
```

### 3) Render markdown pages with `Layout` (`src/App.vue`)

For a simpler integration, use `createDocsRuntime` and pass only arguments. It gives you ready-to-use state and handlers (`currentModule`, `tocItems`, `navigatorItems`, `onPageChange`) with minimal wiring.

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
const currentSlugRef = computed(() => docs.currentSlug.value);
const tocItems = computed(() => docs.tocItems.value);
const navigatorItems = computed(() => docs.navigatorItems.value);

function handlePageChange(slug: string) {
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
    :toc-items="tocItems"
    :navigator-items="navigatorItems"
    :current-slug="currentSlugRef"
    :on-page-change="handlePageChange"
  >
    <component :is="currentModule?.default" v-if="currentModule" />
  </Layout>
</template>
```

## Localization (Markdown Content i18n)

Akari-Docs supports lightweight, file-based localization for markdown content.

### Route Prefix

- English: `/en/<slug>`
- Thai: `/th/<slug>`

Examples:

- `/en/introduction`
- `/th/introduction`

### Migration Note

If you previously used unprefixed routes like `/introduction`, migrate links to the new locale-prefixed format, for example `/en/introduction` (or `/th/introduction`).

### Localized Markdown Files

Use one base file and optional locale variants:

- Base fallback: `src/content/getting-started.md`
- Thai override: `src/content/getting-started.th.md`
- English override (optional): `src/content/getting-started.en.md`

Runtime behavior:

1. Try locale-specific file first (`<slug>.<locale>.md`)
2. Fall back to `<slug>.md` if locale file does not exist

### Language Switcher

- The docs UI includes a language dropdown in the header.
- Changing language updates both route prefix and loaded markdown content.

### Optional Localized Frontmatter Fields

For translatable page metadata, you can add locale-specific frontmatter keys:

```yaml
---
title: Getting Started
title_th: เริ่มต้นใช้งาน
description: Install and configure Akari-Docs
description_th: ติดตั้งและตั้งค่า Akari-Docs
---
```

If locale-specific keys are missing, Akari-Docs falls back to `title` and `description`.

## Security Defaults

Akari-Docs now applies defensive sanitization by default in markdown rendering paths.

- Markdown-rendered HTML is sanitized with DOMPurify before being injected into `innerHTML`.
- This helps reduce XSS risk when content is not fully trusted.
- Plugin option `sanitizeHtml` is enabled by default.

Example:

```ts
import { akariMarkdownPlugin } from "akari-docs/plugin";

export default {
  plugins: [
    akariMarkdownPlugin({
      sanitizeHtml: true,
    }),
  ],
};
```

Set `sanitizeHtml: false` only if your content pipeline is fully trusted and already sanitized upstream.

## How Markdown Files Are Exposed

With `akariMarkdownPlugin` enabled:

- `*.md` files can be imported as Vue components (`default`).
- Each markdown module also exports:
  - `metadata` (frontmatter key/value pairs)
  - `headings` (heading level/text/id list)
- `virtual:akari-md-index` exports a typed `markdownIndex` for navigation.

## Package Exports

| Import Path            | What You Get                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `akari-docs`           | Legacy combined entry (runtime + plugin exports)             |
| `akari-docs/runtime`   | Runtime entry (`Layout`, i18n helpers, docs runtime helpers) |
| `akari-docs/plugin`    | Plugin-only entry (`akariMarkdownPlugin`)                    |
| `akari-docs/style.css` | Stable stylesheet export                                     |

## Plugin Hooks

`akariMarkdownPlugin` accepts optional hooks:

- `transform(document)`
- `render(document, next)`
- `transformHtml(html, document)`

Example:

```ts
import { akariMarkdownPlugin } from "akari-docs/plugin";

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

If Akari-Docs helps your team ship docs faster, you can support ongoing maintenance:

[![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/oatmealxxii) [![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/OatMeal22015) [![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/oatmealxxii)
