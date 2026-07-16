---
paths:
  - "frontend/**"
---

# Frontend / Astro Conventions

This rule auto-loads whenever a `frontend/**` file enters context. It is the authoritative
reference for all Astro frontend and build work on this project. Pairs with `.claude/directus.md`
(the Directus/MCP reference, loaded on demand for schema work).

---

## Architecture reference

Data flow: **Directus** (CMS, port 8055) → `@directus/sdk` → **Astro static pages**. Static by
default (`astro build`); all Directus fetches run at build time inside `getStaticPaths()` and
component frontmatter. The only exception is `/preview/[lang]/[...slug]` (`prerender = false`),
which runs as SSR on the Cloudflare Worker to show draft/unpublished content live.

### lib layer (`src/lib/`)

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript types for the Directus schema. Single source of truth — add new collection types here first. |
| `directus.ts` | Directus SDK client instance + re-exports all types from `types.ts`. Import the client and types from here, never directly from `types.ts`. |
| `api.ts` | All Directus fetch functions (`fetchPageByPermalink`, `fetchGlobals`, `fetchPosts`, `fetchProductBySlug`, etc.). `PAGE_FIELDS` / `PRODUCT_DETAIL_FIELDS` constants define the fields fetched for every page/product query — extend them when adding a new block type or field. |
| `i18n.ts` | `getLanguages()` (cached), `getDefaultLanguage()`, `getTranslation()`. Languages come from the Directus `languages` collection — adding a new language there auto-generates new routes on next build. |
| `catalog.ts` | Category path building (`buildCategoryPaths`), product URL resolution (`getProductFullPath`), page-template resolution (`resolveTemplate`, `getTemplateBlocks`), eCl@ss helpers (`resolveEclassCode`). |
| `price.ts` | `formatPrice(price, locale, currency)`, `isOnSale()`. Never format prices manually. |
| `assets.ts` | `assetUrl(fileUuid, transformParams)` — builds Directus asset URLs. |
| `env.ts` | `getRuntimeEnv(key)` — reads runtime secrets in SSR pages (Cloudflare Worker env, falling back to `import.meta.env`). See "Env Vars in SSR Pages" below for the build-time vs runtime-secret distinction. |

### Routing (`src/pages/`)

| Route | Behaviour |
|---|---|
| `/` | Redirects to `/{defaultLocale}` |
| `/[lang]` | Homepage — fetches `pages` where `permalink = "/"` |
| `/[lang]/[...slug]` | All other pages, post detail pages, **and product/category detail pages**. `getStaticPaths()` generates paths for CMS pages, blog posts, products, and categories. A `type` prop discriminates rendering between `"page"`, `"post"`, `"product"`, and `"category"`. |
| `/preview/[lang]/[...slug]` | SSR-only (`prerender = false`) — live preview of unpublished/draft content, gated by `PREVIEW_SECRET`. Requires `ASTRO_ADAPTER=cloudflare` to build/run; see "Env Vars in SSR Pages" below. |
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

To add a new block type use the `/astro-add-block` skill — it handles `PAGE_FIELDS`/`BLOCK_ITEM_FIELDS` in `api.ts`, `types.ts`, the component, and `PageBlocks.astro` end-to-end.

### Layout

`BaseLayout.astro` fetches `globals` and `navPages` itself on every render — page files don't pass these. It sets the `--accent` CSS variable from `globals.accent_color`, wires the favicon, and renders `Navbar.astro`. `--accent` is defined as a fallback in `global.css` and overridden inline on `<html>` from Directus globals.

### i18n

- Locale is always the first URL segment (`/en-US/...`, `/ar-SA/...`).
- `direction` (`ltr`/`rtl`) from the `languages` collection is set on `<html dir="...">` in `BaseLayout`.
- Translated content is fetched as `translations.*` (wildcard — dot-notation doesn't work for the translations special type) and resolved with `getTranslation(array, locale)`, which falls back to `en-US` then to the first available entry.

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config` file, configured in `global.css`.
- `@tailwindcss/typography` (`prose` classes) for rich text HTML from Directus.
- Component `<style>` blocks are deduplicated by Astro at build time.

---

## Frontend / Astro

- Accent colour: always `text-(--accent)` or `bg-(--accent)` — never hardcoded hex.
- Dark/light variants: always branch on `isDark` using `class:list`, never assume light.
- All user-facing strings from Directus — never hardcode locale text in components.
- `getTranslation(array, locale)` handles en-US fallback automatically — always use it.
- `formatPrice(price, locale)` for all prices — never format manually.
- New types → `types.ts` first, then re-export from `directus.ts`. Never import from `types.ts` directly in components.
- `fields: [...] as any[]` when SDK type inference breaks on M2A or dot-notation fields.
- RTL: never do `direction: "rtl"` detection in components — `BaseLayout` sets `dir` on `<html>` and CSS handles it.
- Never add a field to `BLOCK_ITEM_FIELDS` in `api.ts` without also adding it to the block's TypeScript type.

---

## Env Vars in SSR Pages (Cloudflare)

The site is static by default; only `prerender = false` pages (e.g. `pages/preview/`) run as SSR on the Cloudflare Worker.

- Build-time config (`DIRECTUS_URL`, `ASSETS_URL` in `directus.ts`) — keep using `import.meta.env`. Vite inlines these as literals at build time; this is correct since they're infra config, not rotatable secrets, and `directus.ts` is a module-level singleton with no `Astro` context.
- Runtime secrets read inside an SSR page (e.g. `PREVIEW_SECRET`) — use `await getRuntimeEnv("KEY")` from `lib/env.ts`. It checks `cloudflare:workers`'s `env` (Cloudflare dashboard/wrangler secrets, rotatable without rebuild) first, falling back to `import.meta.env` for `astro dev` and non-Cloudflare builds. `Astro.locals.runtime.env` was removed in Astro v6 / @astrojs/cloudflare v13 and now throws — never use it.
- `getRuntimeEnv` takes no `Astro` param and works at any scope, including module scope — it imports `cloudflare:workers` directly rather than reading `Astro.locals`.

---

## Build Safety

- Kill any running dev server before running `npm run build`: `lsof -ti :4321 | xargs kill -9 2>/dev/null; true`
- If build hangs or fails with chunk errors, clean first: `rm -rf dist node_modules/.vite`
- Always run `npm run build` after any change to `types.ts`, `api.ts`, or new components — TypeScript errors surface here.
- Format check: `npm run format:check` — run before committing.
- For build failures, see the `/debug-build-error` skill.

---

## Common Data Patterns

### Fetching with translations
```ts
fields: ["id", "slug", "translations.*"] as any[]
// Then in component:
const tx = getTranslation(item.translations, locale);
```

### Product URL resolution
```ts
import { buildCategoryPaths, getProductFullPath } from "../lib/catalog";
const catPathMap = buildCategoryPaths(allCategories, locale);
const fullPath = getProductFullPath(product.slug, product.category?.id ?? null, catPathMap, urlStructure);
const href = `/${locale}${productsPagePermalink}/${fullPath}`;
```
`urlStructure` comes from `globals.product_url_structure ?? "category_prefixed"`. Never hardcode it.

### eCl@ss badge
```astro
import EclassBadge from "./EclassBadge.astro";
import { resolveEclassCode } from "../lib/catalog";
const eclassInfo = resolveEclassCode(product, product.category ?? null);
---
{eclassInfo && <EclassBadge code={eclassInfo.code} version={eclassInfo.version} />}
```

### Directus asset URLs
See `.claude/directus.md` → "Asset URLs" — the pattern and rules are identical on the frontend side, no separate convention here.

---

## Schema Change Cascade

Every Directus field addition requires checking all three layers:
1. **Directus** — field created via MCP ✓
2. **`types.ts`** — TypeScript property added with correct nullability ✓
3. **`api.ts`** — field string added to the fetch function's fields array ✓

Missing any one layer causes either a TS error (missing type) or silent data gaps (missing API field).
