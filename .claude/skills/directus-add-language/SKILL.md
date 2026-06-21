---
description: Add a new language to the site — inserts a row into the Directus `languages` collection and verifies the new locale builds correctly.
argument-hint: "<code> <name> [ltr|rtl]"
---

# directus-add-language

Add a new language/locale to the Barkomas site.

## Input

`$ARGUMENTS` — language code (e.g. `nl-NL`), display name (e.g. `Dutch`), and direction (`ltr` or `rtl`, defaults to `ltr`).

## Steps

### 1 — Insert the language row

Use `mcp__barkomas_dev__items` with `action: "create"` on the `languages` collection:
```json
{
  "action": "create",
  "collection": "languages",
  "data": [{ "code": "<code>", "name": "<name>", "direction": "<ltr|rtl>" }]
}
```

### 2 — No frontend code changes needed

`getLanguages()` in `frontend/src/lib/i18n.ts` fetches languages live (cached). `[lang]/index.astro` and `[lang]/[...slug].astro` use `getStaticPaths()`, which automatically generates routes for every language in the collection — no code changes required.

Note: existing translated content (pages, posts, products, etc.) will fall back to `en-US` for the new locale until editors add translations for it — this is expected, not a bug.

### 3 — Verify

```bash
cd frontend && npm run build
```
Confirm:
- Build succeeds
- Total generated page count increased (new locale's pages were added)
- Spot-check one generated page under the new locale segment, e.g. `dist/client/<code>/index.html`

### 4 — Report

New language code, name, direction, and the new total page count after build.
