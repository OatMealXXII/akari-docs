---
title: User Guide
author: Akari Team
description: Localization, security defaults, and markdown content behavior.
order: 4
---

# User Guide

## Localization (Markdown Content i18n)

Akari-Docs supports lightweight, file-based localization for markdown content.

### Route Prefix

- English: `/en/<slug>`
- Thai: `/th/<slug>`

### Localized Markdown Files

Use one base file and optional locale variants:

- Base fallback: `src/content/getting-started.md`
- Thai override: `src/content/getting-started.th.md`
- English override (optional): `src/content/getting-started.en.md`

Runtime behavior:

1. Try locale-specific file first (`<slug>.<locale>.md`)
2. Fall back to `<slug>.md` if locale file does not exist

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

## Security Defaults

Akari-Docs applies defensive sanitization by default in markdown rendering paths.

- Markdown-rendered HTML is sanitized with DOMPurify before being injected into `innerHTML`.
- This helps reduce XSS risk when content is not fully trusted.
- Plugin option `sanitizeHtml` is enabled by default.

Example:

```ts
import { akariMarkdownPlugin } from "akari-docs";

export default {
  plugins: [
    akariMarkdownPlugin({
      sanitizeHtml: true,
    }),
  ],
};
```

## How Markdown Files Are Exposed

With `akariMarkdownPlugin` enabled:

- `*.md` files can be imported as Vue components (`default`).
- Each markdown module also exports:
  - `metadata` (frontmatter key/value pairs)
  - `headings` (heading level/text/id list)
- `virtual:akari-md-index` exports a typed `markdownIndex` for navigation.

## Reading Flow in UI

Your docs system has three practical areas:

- Left panel: table of contents for the current page.
- Center panel: the article content.
- Right panel: page navigation between docs.

This layout helps users stay oriented in long pages and switch between topics quickly.

## Recommended Content Writing Style

- Use short sections and meaningful headings.
- Keep one topic per section.
- Add examples near the related explanation.
- Prefer direct language over internal jargon.

## For Teams Running This System

Before publishing docs updates:

1. Confirm each page has a clear title and description.
2. Check that heading IDs and TOC links are valid.
3. Verify navigation links between key pages.
4. Smoke test in mobile and desktop layouts.

## Next Step

Continue with [Deploy on Vercel](/deployment-vercel) for production deployment and publish notes.
