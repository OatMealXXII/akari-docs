---
title: เอกสารอ้างอิง API
author: Akari Team
description: API สาธารณะของ akariMarkdownPlugin และ Layout
order: 3
---

# เอกสารอ้างอิง API

## Package Exports

```ts
import { akariMarkdownPlugin, Layout } from "akari-docs";
import type {
  FrontmatterData,
  FrontmatterValue,
  LayoutProps,
  TocItem,
  NavItem,
  FooterData,
} from "akari-docs";
```

Plugin-only import path:

```ts
import { akariMarkdownPlugin } from "akari-docs/plugin";
```

## `akariMarkdownPlugin(options?)`

สร้าง Vite plugin ที่ทำงานดังนี้:

- parse frontmatter จาก markdown
- ใส่ heading IDs ให้เนื้อหา
- export heading metadata สำหรับ navigation

### Type

```ts
function akariMarkdownPlugin(options?: AkariMarkdownPluginOptions): Plugin;
```

## `Layout` Component

### Props

```ts
interface LayoutProps {
  frontmatter?: FrontmatterData;
  onPageChange?: (slug: string) => void;
  tocItems?: readonly TocItem[];
  navigatorItems?: readonly NavItem[];
  currentSlug?: string;
  footer?: FooterData;
}
```

### TOC Item

```ts
interface TocItem {
  label: string;
  href: string; // เช่น #getting-started
  level?: number; // แนะนำ: 2 หรือ 3
}
```

### Navigator Item

```ts
interface NavItem {
  label: string;
  href: string;
  slug?: string;
  isActive?: boolean;
}
```

### Frontmatter Shape

```ts
type FrontmatterValue = string | number | boolean;

interface FrontmatterData {
  title?: string;
  [key: string]: FrontmatterValue | undefined;
}
```

ถ้าไม่มี `frontmatter` ระบบจะ fallback ค่า title, author และ description ให้อัตโนมัติ

## Footer Types

```ts
type FooterIconName = "docs" | "github" | "home" | "external" | "link";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  icon?: FooterIconName | string;
}

interface FooterData {
  brand: string;
  description?: string;
  legalText?: string;
  links?: readonly FooterLink[];
}
```
