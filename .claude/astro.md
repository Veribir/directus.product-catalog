# Frontend / Astro Conventions

This document is the authoritative reference for all Astro frontend and build work on this project.
Read it fully before creating or modifying frontend code. Pairs with `.claude/directus.md` (the Directus/MCP reference).

---

## Frontend / Astro

- Accent colour: always `text-(--accent)` or `bg-(--accent)` — never hardcoded hex.
- Dark/light variants: always branch on `isDark` using `class:list`, never assume light.
- All user-facing strings from Directus — never hardcode locale text in components.
- `getTranslation(array, locale)` handles en-US fallback automatically — always use it.
- `formatPrice(price, locale)` for all prices — never format manually.
- New types → `types.ts` first, then re-export from `directus.ts`. Never import from `types.ts` directly in components.
- `fields: [...] as any[]` when SDK type inference breaks on M2A or dot-notation fields.

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
