---
title: Deploy on Vercel
author: Akari Team
description: Production deployment checklist for Vercel.
order: 5
---

# Deploy on Vercel

## Prerequisites

- Source code is pushed to your Git repository.
- Build succeeds locally (`npm run build` or `bun run build`).
- Your project uses `dist` as the static output folder.

## Vercel Project Settings

When importing the repository into Vercel, use:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## SPA Routing Requirement

This docs system uses history-based routing for page slugs (for example `/introduction`).

To avoid 404 on hard-refresh for nested routes, add a rewrite to `index.html`.
A ready `vercel.json` is included in the project root.

## Deployment Steps

1. Import repository in Vercel dashboard.
2. Confirm build/output settings.
3. Trigger first deployment.
4. Open production URL and test routes.

## Post-Deploy Checks

Verify these cases:

1. Open `/introduction` directly in a new tab.
2. Refresh on `/api-reference` (must not 404).
3. Open a deep hash link like `/getting-started#basic-usage`.
4. Confirm CSS and icons load correctly.

## Optional CLI Deployment

```bash
npx vercel
npx vercel --prod
```

## Troubleshooting

### 404 on page refresh

- Ensure `vercel.json` exists in the project root.
- Confirm rewrite targets `/index.html`.

### Static assets fail to load

- Confirm assets are referenced by generated Vite paths.
- Check that output directory is exactly `dist`.

### Build passes locally but fails in Vercel

- Match local Node and package manager versions.
- Re-check build command and lockfile consistency.

## Next Step

After deploy, return to [API Reference](/api-reference) to validate public exports in production.
