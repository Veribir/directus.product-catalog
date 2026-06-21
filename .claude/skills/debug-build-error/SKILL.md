---
description: Classify and fix an Astro build failure — stale cache, TypeScript type gaps, missing Directus fields, or prerender crashes.
argument-hint: "[error message or symptom]"
---

# debug-build-error

Diagnose and fix a failing `npm run build` in the Astro frontend.

## Input

`$ARGUMENTS` — the error message or a description of the symptom (optional; read the latest build output if omitted).

## Steps

### 1 — Reproduce

```bash
cd frontend
lsof -ti :4321 | xargs kill -9 2>/dev/null; true   # kill any running dev server first
npm run build
```

### 2 — Classify the error

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '...mjs'` | Stale Vite cache | `rm -rf dist node_modules/.vite && npm run build` |
| TypeScript type error on a field | `types.ts` type doesn't match what's actually fetched/used | Read the exact line; check `types.ts` and `api.ts` for the field. Often needs a `\| null` added, or an `as any[]` cast on an SDK fields array. |
| `"field X does not exist on type Y"` | `types.ts` is missing the field | Run `/sync-types` to find all gaps across collections |
| Prerender crash on a specific route | `getStaticPaths()` fetches a field that doesn't exist in Directus (404 from SDK) | Check that route's `api.ts` fields array against the live schema via `mcp__barkomas_dev__fields` (`action: "read"`) |
| Chunk/build hang with no clear error | Corrupted build cache | `rm -rf dist node_modules/.vite`, retry |
| `[NoAdapterInstalled]` error | Build run without the Cloudflare adapter while an SSR (`prerender = false`) page exists | Run with `ASTRO_ADAPTER=cloudflare npm run build`, or set it in `.env` |

### 3 — Apply the fix and re-verify

After fixing, re-run `npm run build` to confirm. Do not consider the task done until the build succeeds cleanly with no errors.

### 4 — Report

Root cause, fix applied, and confirmation the build now passes (mention final page count if relevant).
