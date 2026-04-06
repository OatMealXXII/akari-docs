---
title: Getting Started
author: Akari Team
description: Install Akari-Docs and configure it in a Vite project.
order: 2
---

# Getting Started

## 1. Install

```bash
npm install akari-docs
```

If your project does not already include the peer dependencies:

```bash
npm install vue vue-router
```

## 2. Configure Vite

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
```

## 3. Import Layout and Styles

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "akari-docs/style.css";

createApp(App).mount("#app");
```

## 4. Basic Usage

```vue
<script setup lang="ts">
import { Layout } from "akari-docs";

const tocItems = [
  { label: "Overview", href: "#overview", level: 2 },
  { label: "Usage", href: "#usage", level: 2 },
];

const navigatorItems = [
  {
    label: "Introduction",
    href: "/introduction",
    slug: "introduction",
    isActive: true,
  },
  { label: "API Reference", href: "/api-reference", slug: "api-reference" },
];
</script>

<template>
  <Layout
    :toc-items="tocItems"
    :navigator-items="navigatorItems"
    :current-slug="'introduction'"
  >
    <article>
      <h2 id="overview">Overview</h2>
      <h2 id="usage">Usage</h2>
    </article>
  </Layout>
</template>
```

## 5. Frontmatter + TOC Behavior

- Frontmatter is optional and has safe fallback values in layout rendering.
- TOC is intended for heading levels **2** and **3**.
- Active highlighting updates on scroll and content changes.

## 6. Deploy to Vercel

Follow [Deploy on Vercel](/deployment-vercel) for production-ready setup, including SPA route rewrites.
