---
title: API Reference
author: Akari Team
description: Package exports, plugin hooks, and layout API surface.
order: 3
---

# API Reference

## Package Exports

| Import Path            | What You Get                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `akari-docs`           | Legacy combined entry (runtime + plugin exports)                  |
| `akari-docs/runtime`   | `Layout`, i18n helpers, runtime helpers, and runtime-facing types |
| `akari-docs/plugin`    | Plugin-only entry (`akariMarkdownPlugin`)                         |
| `akari-docs/style.css` | Stable stylesheet export                                          |

```ts
import { Layout, createDocsRuntime } from "akari-docs/runtime";
import { akariMarkdownPlugin } from "akari-docs/plugin";
import type {
  FrontmatterData,
  FrontmatterValue,
  LayoutProps,
  TocItem,
  NavItem,
  FooterData,
} from "akari-docs/runtime";
```

## `akariMarkdownPlugin(options?)`

Creates a Vite plugin that:

- Parses markdown frontmatter.
- Adds heading IDs.
- Exposes heading metadata for navigation.
- Supports hooks for transform and render customization.

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

## Runtime Helper API

```ts
createDocsRuntime({
  markdownModules,
  pageIndex: markdownIndex,
  locale: "en",
  initialSlug: "introduction",
});
```

Use `createDocsRuntime` when you want one-call setup for `currentModule`, `tocItems`, `navigatorItems`, and `onPageChange`.

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
