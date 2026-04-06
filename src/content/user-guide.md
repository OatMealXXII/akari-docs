---
title: User Guide
author: Akari Team
description: How users can read and navigate documentation in your system.
order: 4
---

# User Guide

## What Users See in the Docs System

Your docs system has three practical areas:

- Left panel: table of contents for the current page.
- Center panel: the article content.
- Right panel: page navigation between docs.

This layout helps users stay oriented in long pages and switch between topics quickly.

## Reading Flow for End Users

1. Open a page from the right-side navigator.
2. Use the left-side TOC to jump to sections.
3. Scroll naturally while the active heading updates in the TOC.
4. Use browser back/forward to move between opened pages.

## URL Behavior

- Page URLs use slugs such as `/introduction` or `/api-reference`.
- Section links use hash anchors such as `#getting-started`.
- Deep links can be shared directly to a page and heading.

## Accessibility and Usability Notes

- Headings are structured for readable navigation.
- TOC levels are focused on H2 and H3 for clarity.
- Frontmatter is optional; safe fallback text is shown when missing.

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

Continue with [Deploy on Vercel](/deployment-vercel) for production deployment.
