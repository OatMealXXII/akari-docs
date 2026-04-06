---
title: API Reference
author: Akari Team
description: Public APIs for akariMarkdownPlugin and Layout.
order: 3
---

# API Reference

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

Creates a Vite plugin that:

- Parses markdown frontmatter.
- Adds heading IDs.
- Exposes heading metadata for navigation.

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
  href: string; // e.g. #getting-started
  level?: number; // expected: 2 or 3
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

If `frontmatter` is missing, Layout uses safe defaults for title, author, and description.

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
