---
title: Introduction
author: Akari Team
description: What Akari-Docs is and why it stays zero-bloat.
order: 1
---

# Akari-Docs Introduction

## What Is Akari-Docs?

Akari-Docs is a **Vue + Vite documentation package** designed for teams that want a clean docs experience without carrying a heavy framework runtime they do not need.

The package provides:

- A markdown plugin for extracting metadata and headings.
- A production-friendly documentation layout.
- Dynamic TOC and navigator behavior with active highlighting.

## Why Zero-Bloat?

Akari-Docs is built with a strict rule: **ship only what is required for docs rendering and navigation**.

Core principles:

- Keep third-party runtime requirements explicit.
- Avoid shipping demo-only code in the package output.
- Keep TOC tracking efficient for long documents.
- Generate docs content from markdown source directly.

## Architecture Snapshot

```text
Markdown Content -> akariMarkdownPlugin -> heading/frontmatter index -> Layout (TOC + Navigator)
```

## Who Should Use It?

- Teams shipping component libraries and needing internal/external docs.
- Projects already using Vue + Vite.
- Maintainers who want strict control over package footprint.

## Next Step

Continue with [Getting Started](/getting-started) to install and wire the package into your Vite setup.

Then read [User Guide](/user-guide) for end-user navigation behavior inside your docs system.
