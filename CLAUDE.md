# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
                 — Birds-eye guide to the product catalog schema: collection groups,
                   key fields, UX flow, relationship map. Read before product catalog work.
    product-page-mapping.md
                 — Maps every visible UI element on a product detail page to its exact
                   Directus source field. Read before changing product page rendering.
  .mcp.json      — MCP server config (barkomas_dev → Directus at localhost:8055)
  .claude/
    directus.md  — Full Directus/MCP conventions, schema patterns, translations setup (read before any Directus work)
    astro.md     — Astro/frontend conventions, SSR env vars, build safety (read before any frontend work)
    agents/      — Claude Code project agents (catalog-engineer — the full-stack project agent)
    skills/      — Claude Code slash-command skills
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

### Data flow
Directus (CMS, port 8055) → `@directus/sdk` → Astro static pages

The frontend is **static by default** (`astro build`). All Directus fetches happen at build time inside `getStaticPaths()` and component frontmatter. The only exception is the `/preview/[lang]/[...slug]` route (`prerender = false`), which runs as SSR on the Cloudflare Worker to show draft/unpublished content live.

### Frontend lib layer (`frontend/src/lib/`)

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript types for the Directus schema. Single source of truth — add new collection types here first. |
| `directus.ts` | Directus SDK client instance + re-exports all types from `types.ts`. Import the client and types from here, never directly from `types.ts`. |
| `api.ts` | All Directus fetch functions (`fetchPageByPermalink`, `fetchGlobals`, `fetchPosts`, `fetchProductBySlug`, etc.). `PAGE_FIELDS` / `PRODUCT_DETAIL_FIELDS` constants define the fields fetched for every page/product query — extend them when adding a new block type or field. |
| `i18n.ts` | `getLanguages()` (cached), `getDefaultLanguage()`, `getTranslation()`. Languages come from the Directus `languages` collection — adding a new language there auto-generates new routes on next build. |
| `catalog.ts` | Category path building (`buildCategoryPaths`), product URL resolution (`getProductFullPath`), page-template resolution (`resolveTemplate`, `getTemplateBlocks`), eCl@ss helpers (`resolveEclassCode`). |
| `price.ts` | `formatPrice(price, locale, currency)`, `isOnSale()`. Never format prices manually. |
| `assets.ts` | `assetUrl(fileUuid, transformParams)` — builds Directus asset URLs. |
| `env.ts` | `getRuntimeEnv(key)` — reads runtime secrets in SSR pages (Cloudflare Worker env, falling back to `import.meta.env`). See `.claude/astro.md` for the build-time vs runtime-secret distinction. |

### Routing (`frontend/src/pages/`)

| Route | Behaviour |
|---|---|
| `/` | Redirects to `/{defaultLocale}` |
| `/[lang]` | Homepage — fetches `pages` where `permalink = "/"` |
| `/[lang]/[...slug]` | All other pages, post detail pages, **and product/category detail pages**. `getStaticPaths()` generates paths for CMS pages, blog posts, products, and categories. A `type` prop discriminates rendering between `"page"`, `"post"`, `"product"`, and `"category"`. |
| `/preview/[lang]/[...slug]` | SSR-only (`prerender = false`) — live preview of unpublished/draft content, gated by `PREVIEW_SECRET`. Requires `ASTRO_ADAPTER=cloudflare` to build/run; see `.claude/astro.md` → "Env vars in SSR pages". |
| `/api/deploy` | API endpoint, not a page route — triggers a deploy. |

The `[lang]` segment is always a language code from the `languages` collection (e.g. `en-US`, `fr-FR`).
Post detail URLs are `/{lang}/{postsPagePermalink}/{postSlug}` — the prefix comes from whichever page contains a `block_posts` block, never hardcoded.
Product detail URLs follow `globals.product_url_structure` (`category_prefixed` by default) — see `catalog.ts` → `getProductFullPath()` and `docs/product-page-mapping.md` for the full resolution logic.

### Page builder blocks

`PageBlocks.astro` dispatches to block components based on `block.collection`:

| Directus collection | Component |
|---|---|
| `block_hero` | `BlockHero.astro` — image + headline, 3 layout modes |
| `block_hero_slider` | `BlockHeroSlider.astro` |
| `block_richtext` | `BlockRichtext.astro` — prose HTML, alignment from Directus |
| `block_posts` | `BlockPosts.astro` — fetches posts at build time using `block.limit` |
| `block_cta_banner` | `BlockCtaBanner.astro` |
| `block_numbered_list` | `BlockNumberedList.astro` |
| `block_features_grid` | `BlockFeaturesGrid.astro` |
| `block_brands_logos` | `BlockBrandLogos.astro` |
| `block_products` | `BlockProducts.astro` — product grid/list, filtered by category |
| `block_product_categories` | `BlockProductCategories.astro` |
| `block_product_category_cards` | `BlockProductCategoryCards.astro` |
| `block_product_specs` | `BlockProductSpecs.astro` — used on product detail pages, not the general page builder |

To add a new block type: use the `/astro-add-block` skill, which handles `PAGE_FIELDS`/`BLOCK_ITEM_FIELDS` in `api.ts`, `types.ts`, the component, and `PageBlocks.astro` end-to-end.

### Product catalog

The product catalog (categories, products, variants, specs, pricing, RFQ, per-product layout blocks) is a much larger subsystem layered on top of the same page-builder pattern. Read `docs/product-catalog-schema-guide.md` for the schema overview and `docs/product-page-mapping.md` for exactly which Directus field drives each piece of the product detail page UI — don't try to reverse-engineer it from the SQL or component code directly.

### Layout

`BaseLayout.astro` fetches `globals` and `navPages` itself on every render — page files don't pass these. It sets `--accent` CSS variable from `globals.accent_color`, wires the favicon, and renders `Navbar.astro`.

The `--accent` CSS variable is defined as a fallback in `global.css` and overridden inline on `<html>` from Directus globals. All accent colour usage in components should reference `text-[var(--accent)]` or `text-(--accent)`.

### i18n

- Locale is always the first URL segment (`/en-US/...`, `/ar-SA/...`)
- `direction` (`ltr`/`rtl`) from the `languages` collection is set on `<html dir="...">` in `BaseLayout`
- Translated content is fetched as `translations.*` (wildcard — dot-notation doesn't work for the translations special type) and resolved with `getTranslation(array, locale)` which falls back to `en-US` then to the first available entry

### Directus MCP

The `mcp__barkomas_dev__*` tools connect to Directus at `http://localhost:8055`. Before any Directus schema work, read `.claude/directus.md` — it covers collection/field/relation patterns, tab grouping, translations setup, file/image import, known MCP tool gotchas, and the `languages` collection conventions. Before any frontend/build work, read `.claude/astro.md`.

For multi-step feature work spanning both Directus and the frontend, use the `catalog-engineer` agent (`.claude/agents/catalog-engineer.md`) — it orchestrates the project's skills (`/directus-add-field`, `/directus-new-collection`, `/astro-add-block`, `/sync-types`, `/directus-add-language`, `/debug-build-error`) and knows the full decision tree for common tasks.

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config` file, configured in `global.css`
- `@tailwindcss/typography` (`prose` classes) for rich text HTML from Directus
- Component `<style>` blocks are deduplicated by Astro at build time
