---
title: Deploy on Vercel
author: Akari Team
description: Build, publish, and deployment notes for production readiness.
order: 5
---

# Deploy on Vercel

## Vercel Project Settings

When importing the repository into Vercel, use:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## SPA Routing Requirement

This docs system uses history-based routing for page slugs.

To avoid 404 on hard-refresh for nested routes, add a rewrite to `index.html`.
A ready `vercel.json` is included in the project root.

## Development Commands

```bash
npm run dev
npm run test
npm run build
npm run preview
```

## Build and Publish Notes

- Build output is published from `dist` only.
- `dist/style.css` is always created for stable CSS export.
- `prepublishOnly` runs test + build before publish.

Example publish flow:

```bash
npm adduser
npm publish --access public
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

## Support

If Akari-Docs helps your team ship docs faster, you can support ongoing maintenance:

- BuyMeACoffee: https://buymeacoffee.com/oatmealxxii
- Patreon: https://patreon.com/OatMeal22015
- Ko-Fi: https://ko-fi.com/oatmealxxii

## Next Step

Return to [API Reference](/api-reference) to validate public exports in production.
