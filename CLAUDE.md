# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repo. This file is the **index** —
detailed references live in `.claude/` and `docs/`. Follow the pointers before working in a layer.

---

## Project Structure

```
barkomas-dev/
  directus/      — Directus CMS (Docker + Neon PostgreSQL)
    schema/product-catalog-schema.sql
                 — Authoritative SQL DDL for the product catalog + product page-builder
                   block schema. Single source of truth for field names, types, enums, FKs.
  frontend/      — Astro 6 frontend
  docs/
    plans/       — Implementation plan documents (feature designs, architecture decisions)
    product-catalog-schema-guide.md
                 — Birds-eye guide to the product catalog schema. Read before catalog work.
    product-page-mapping.md
                 — Maps each product-detail UI element to its exact Directus source field.
  .mcp.json      — MCP server config (barkomas_dev → Directus at localhost:8055)
  .claude/
    directus.md  — Full Directus/MCP conventions, schema patterns, translations (read before Directus work)
    rules/       — Path-gated docs that auto-load on matching files:
                   frontend.md (frontend architecture + conventions, on frontend/**),
                   directus-schema.md (on directus/schema/** + types.ts)
    settings.json — Committed permissions; settings.local.json holds personal overrides
    skills/      — Claude Code slash-command skills (see "Skills & workflows" below)
```

---

## Commands

All frontend commands run from `frontend/`:

```bash
npm run dev          # start Astro dev server (localhost:4321)
npm run build        # production build
npm run preview      # preview production build
npm run format       # format all files with Prettier
npm run format:check # check formatting (use in CI)
```

Start Directus (from `directus/`):
```bash
docker compose up -d    # start Directus on localhost:8055
docker compose down     # stop
docker compose logs -f  # tail logs
```

---

## Architecture

Data flow: **Directus** (CMS, port 8055) → `@directus/sdk` → **Astro static pages**. The frontend
is static by default (`astro build`); all fetches happen at build time. The only SSR route is
`/preview/[lang]/[...slug]` (`prerender = false`), which runs on the Cloudflare Worker for live
draft preview.

The detailed frontend map — **lib layer, routing, page-builder block dispatch, layout, i18n, and
styling** — lives in `.claude/rules/frontend.md`, which auto-loads whenever a `frontend/**` file
enters context. Read it before frontend/build work.

### Product catalog

The product catalog (categories, products, variants, specs, pricing, RFQ, per-product layout
blocks) is a larger subsystem on top of the same page-builder pattern. Read
`docs/product-catalog-schema-guide.md` for the schema overview and `docs/product-page-mapping.md`
for which Directus field drives each piece of the product detail UI — don't reverse-engineer it
from the SQL or components.

### Directus MCP

The `mcp__barkomas_dev__*` tools connect to Directus at `http://localhost:8055`. Before any
Directus schema work, read `.claude/directus.md` — collection/field/relation patterns, tab
grouping, translations setup, file/image import, MCP gotchas, and `languages` conventions.

---

## Skills & workflows

Route common tasks through the project skills first — each handles its slice end-to-end (MCP calls,
conventions, verification), then handle anything the skill doesn't cover.

| Task | Skill | After the skill |
|---|---|---|
| Add a field to any collection | `/directus-add-field` | Skill also cascades to `types.ts` + `api.ts`; update the consuming component if the field is shown, then build. |
| Create a new collection | `/directus-new-collection` | Add types to `types.ts`, a fetch function to `api.ts`, export from `directus.ts`, wire into the page/component, build. |
| Add a page builder block | `/astro-add-block` | Verify the build passes. |
| Add a language/locale | `/directus-add-language` | Handled end-to-end (insert + verify). |
| Check `types.ts` vs live schema | `/sync-types` | — |
| Diagnose a failing `npm run build` | `/debug-build-error` | Classifies the failure and applies the fix. |

**Debugging a UI issue** (no dedicated skill): check the dev server (`lsof -ti :4321`; if down,
`cd frontend && npm run dev`) → identify the responsible component → read it + its data source in
`api.ts` → if data-related, inspect the Directus item via `mcp__barkomas_dev__items`.

---

## Project-wide rules

- **Schema changes cascade across three layers** — Directus (MCP) → `frontend/src/lib/types.ts`
  → `frontend/src/lib/api.ts` fetch fields. Missing any one causes a TS error or silent data gap.
  See `.claude/rules/frontend.md` → "Schema Change Cascade".
- Place plan/design docs in `docs/plans/`, never at the project root.
- Never use `--no-verify` on git or skip builds to "save time" — catch errors before they compound.
- Never add `Co-Authored-By: Claude` or any AI co-author line to commit messages.
