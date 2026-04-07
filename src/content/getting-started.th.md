---
title: เริ่มต้นใช้งาน
author: Akari Team
description: ติดตั้งและตั้งค่า Akari-Docs ในโปรเจกต์ Vite
order: 2
---

# เริ่มต้นใช้งาน

## แผนผังไฟล์

- ตั้งค่า Vite plugin: `vite.config.ts`
- import style และ mount แอป: `src/main.ts`
- render หน้าเอกสารด้วย `Layout`: `src/App.vue`
- ไฟล์เนื้อหา markdown: `src/content/*.md`

## โครงสร้างโปรเจกต์แนะนำ

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

## 1. ติดตั้ง

```bash
npm install akari-docs
```

ถ้าโปรเจกต์ยังไม่มี peer dependencies:

```bash
npm install vue vue-router
```

## 2. ตั้งค่า Vite (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { akariMarkdownPlugin } from "akari-docs";

export default defineConfig({
  plugins: [vue(), akariMarkdownPlugin()],
});
```

## 3. Import Layout และ Styles (`src/main.ts`)

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "akari-docs/style.css";

createApp(App).mount("#app");
```

## 4. ตัวอย่างใช้งานพื้นฐาน (`src/App.vue`)

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

## 5. พฤติกรรม Frontmatter + TOC

- Frontmatter เป็น optional ได้ และ Layout มีค่า fallback ให้
- TOC โฟกัสที่ heading ระดับ **2** และ **3**
- Active highlight อัปเดตตามการ scroll และการเปลี่ยนเนื้อหา

## 6. Deploy ไป Vercel

ดูขั้นตอนต่อที่ [Deploy on Vercel](/deployment-vercel)
