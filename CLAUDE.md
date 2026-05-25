# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Structure

```
barkomas-dev/
  directus/      — Directus CMS (Docker + Neon PostgreSQL)
  frontend/      — Astro 6 frontend
  docs/
    plans/       — Implementation plan documents (feature designs, architecture decisions)
  .mcp.json      — MCP server config (barkomas_dev → Directus at localhost:8055)
  .claude/
    directus.md  — Full Directus conventions, patterns, and MCP tool rules (read before any Directus work)
    agents/      — Claude Code project agents
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

The frontend is **fully static** (`astro build`). All Directus fetches happen at build time inside `getStaticPaths()` and component frontmatter. There is no SSR.

### Frontend lib layer (`frontend/src/lib/`)

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript types for the Directus schema. Single source of truth — add new collection types here first. |
| `directus.ts` | Directus SDK client instance + re-exports all types from `types.ts`. Import the client and types from here, never directly from `types.ts`. |
| `api.ts` | All Directus fetch functions (`fetchPageByPermalink`, `fetchGlobals`, `fetchPosts`, etc.). `PAGE_FIELDS` constant defines the M2A block fields fetched for every page query — extend it when adding a new block type. |
| `i18n.ts` | `getLanguages()` (cached), `getDefaultLanguage()`, `getTranslation()`. Languages come from the Directus `languages` collection — adding a new language there auto-generates new routes on next build. |

### Routing (`frontend/src/pages/`)

| Route | Behaviour |
|---|---|
| `/` | Redirects to `/{defaultLocale}` |
| `/[lang]` | Homepage — fetches `pages` where `permalink = "/"` |
| `/[lang]/[...slug]` | All other pages AND post detail pages. `getStaticPaths()` generates paths for both CMS pages and blog posts. The `type` prop discriminates between `"page"` and `"post"` rendering. |

The `[lang]` segment is always a language code from the `languages` collection (e.g. `en-US`, `fr-FR`).
Post detail URLs are `/{lang}/{postsPagePermalink}/{postSlug}` — the prefix comes from whichever page contains a `block_posts` block, never hardcoded.

### Page builder blocks

`PageBlocks.astro` dispatches to block components based on `block.collection`:

| Directus collection | Component |
|---|---|
| `block_hero` | `BlockHero.astro` — image + headline, 3 layout modes |
| `block_richtext` | `BlockRichtext.astro` — prose HTML, alignment from Directus |
| `block_posts` | `BlockPosts.astro` — fetches posts at build time using `block.limit` |

To add a new block type: (1) add fields to `PAGE_FIELDS` in `api.ts`, (2) add types to `types.ts`, (3) create the component, (4) add it to `PageBlocks.astro`.

### Layout

`BaseLayout.astro` fetches `globals` and `navPages` itself on every render — page files don't pass these. It sets `--accent` CSS variable from `globals.accent_color`, wires the favicon, and renders `Navbar.astro`.

The `--accent` CSS variable is defined as a fallback in `global.css` and overridden inline on `<html>` from Directus globals. All accent colour usage in components should reference `text-[var(--accent)]` or `text-(--accent)`.

### i18n

- Locale is always the first URL segment (`/en-US/...`, `/ar-SA/...`)
- `direction` (`ltr`/`rtl`) from the `languages` collection is set on `<html dir="...">` in `BaseLayout`
- Translated content is fetched as `translations.*` (wildcard — dot-notation doesn't work for the translations special type) and resolved with `getTranslation(array, locale)` which falls back to `en-US` then to the first available entry

### Directus MCP

The `mcp__barkomas_dev__*` tools connect to Directus at `http://localhost:8055`. Before any Directus schema work, read `.claude/directus.md` — it covers collection/field/relation patterns, translations setup, known MCP tool gotchas, and the `languages` collection conventions.

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config` file, configured in `global.css`
- `@tailwindcss/typography` (`prose` classes) for rich text HTML from Directus
- Component `<style>` blocks are deduplicated by Astro at build time
