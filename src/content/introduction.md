---
title: Introduction
author: Akari Team
description: Product overview, value proposition, and who Akari-Docs is for.
order: 1
---

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

- A markdown plugin for extracting metadata and headings.
- A production-friendly documentation layout.
- Dynamic TOC and navigator behavior with active highlighting.

## When Not to Use Akari-Docs

Akari-Docs is intentionally focused. You may not need it if:

- You are building a docs site outside the Vue + Vite ecosystem.
- You need a fully managed docs platform with hosted search, analytics, and CMS workflows included.
- Your docs are static enough that a plain markdown renderer with no TOC/nav logic is already sufficient.

If these do not apply, Akari-Docs is a strong fit when you want speed, control, and predictable outputs.
