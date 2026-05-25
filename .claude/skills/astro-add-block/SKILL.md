---
description: Add a new page builder block end-to-end — Directus collection, types.ts, api.ts BLOCK_ITEM_FIELDS, component, and PageBlocks.astro dispatch.
argument-hint: "<block_name> [description of what the block does]"
---

# astro-add-block

Add a new page builder block to the Barkomas frontend. A block is a reusable page section that can be placed on any CMS page via the `pages` collection's M2A `blocks` junction.

## Input

`$ARGUMENTS` — block name in snake_case without `block_` prefix (e.g. `testimonials`, `cta_banner`), plus an optional description of the block's purpose.

The full Directus collection name will be `block_<name>`. The component file will be `Block<PascalName>.astro`.

## Steps

### 1 — Read existing block for reference

Read one existing block component (e.g. `frontend/src/components/blocks/BlockRichtext.astro`) and its corresponding Directus fields via `mcp__barkomas_dev__fields` on `block_richtext` to understand the exact pattern before creating anything.

Also read `frontend/src/lib/api.ts` lines 33–100 (`BLOCK_ITEM_FIELDS` constant) and `frontend/src/components/PageBlocks.astro` in full.

### 2 — Create Directus collection `block_<name>`

Use `mcp__barkomas_dev__collections` with `action: "create"`.

Required fields for a block collection:
```json
[
  { "field": "id", "type": "uuid", "meta": { "special": ["uuid"], "interface": "input", "readonly": true, "hidden": true, "sort": 1 }, "schema": { "is_primary_key": true, "has_auto_increment": false } },
  { "field": "collection", "type": "string", "meta": { "interface": "input", "hidden": true, "sort": 2 }, "schema": { "default_value": "block_<name>", "is_nullable": false } }
]
```

Collection meta: `{ "icon": "smart_button", "group": "website", "hidden": true }`

Then add the `translations` alias and create the `block_<name>_translations` junction table (following the same pattern as `directus-new-collection` skill). Typical translatable fields: `tagline`, `headline`, and any block-specific text.

Add block-specific non-translatable fields (layout modes, limits, options) directly on `block_<name>`.

### 3 — Wire M2A junction

The `pages` collection uses an M2A `blocks` junction (`pages_blocks`). The new block collection is automatically available once created — no extra relation is needed. Directus picks it up from the existing M2A relation.

**Verify**: use `mcp__barkomas_dev__relations` to confirm `pages_blocks` already has M2A special and the block collection is accessible.

### 4 — Update `frontend/src/lib/types.ts`

Add types for the new block. Follow this pattern (from existing blocks):

```ts
export type Block<Name>Translation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  // ... block-specific fields
};

export type Block<Name> = {
  id: string;
  collection: "block_<name>";
  translations: Block<Name>Translation[];
  // ... non-translatable config fields
};
```

Also add `Block<Name>` to the `PageBlock` union in the `item` discriminated union.

### 5 — Export from `frontend/src/lib/directus.ts`

Add `Block<Name>Translation` and `Block<Name>` to the re-export list.

### 6 — Update `frontend/src/lib/api.ts` — `BLOCK_ITEM_FIELDS`

Add a new group of field strings to the `BLOCK_ITEM_FIELDS` constant array:

```ts
// block_<name>
"blocks.item:block_<name>.id",
"blocks.item:block_<name>.collection",
// ... non-translatable config fields
"blocks.item:block_<name>.translations.languages_code",
"blocks.item:block_<name>.translations.tagline",
"blocks.item:block_<name>.translations.headline",
// ... other translatable fields
```

Use `"translations.*"` only if all translation fields are needed and the set is large; otherwise list individually for clarity.

### 7 — Create `frontend/src/components/blocks/Block<Name>.astro`

Component structure:

```astro
---
import type { Block<Name> } from "../../lib/directus";
import { getTranslation } from "../../lib/i18n";

interface Props {
  block: Block<Name>;
  background: "light" | "dark";
  locale: string;
  pagePermalink: string;
}

const { block, background, locale, pagePermalink } = Astro.props;
const tx = getTranslation(block.translations, locale);
const isDark = background === "dark";
---

<section
  class:list={[
    "px-6 py-20 md:px-16",
    isDark ? "bg-slate-800 text-slate-50" : "bg-slate-50 text-slate-900",
  ]}
>
  <div class="max-w-6xl mx-auto">
    {(tx?.tagline || tx?.headline) && (
      <div class="mb-12 text-center">
        {tx.tagline && (
          <p class="text-xs font-semibold tracking-widest uppercase mb-3 text-(--accent)">
            {tx.tagline}
          </p>
        )}
        {tx.headline && (
          <h2 class="text-3xl md:text-4xl font-bold leading-snug">{tx.headline}</h2>
        )}
      </div>
    )}
    <!-- block-specific content here -->
  </div>
</section>
```

Styling rules:
- Always use `text-(--accent)` for accent colour (not hardcoded colours)
- Respect `isDark` for backgrounds and text colours
- Section wrapper: `px-6 py-20 md:px-16` + `max-w-6xl mx-auto` inner container
- Never hardcode locale strings — always go through `getTranslation()`

### 8 — Update `frontend/src/components/PageBlocks.astro`

Three changes:
1. Add the new type to the import statement from `../lib/directus`
2. Add to the `KnownCollection` type union: `| "block_<name>"`
3. Add to the `KnownBlock` item union: `| Block<Name>`
4. Add a new `if (block.collection === "block_<name>")` branch in the render switch

### 9 — Verify

Run `cd frontend && npm run build` and confirm:
- Zero TypeScript errors
- Page count unchanged (new block won't appear until added to a page in Directus)
- No missing field warnings

Report: collection created, types added, BLOCK_ITEM_FIELDS updated, component path, PageBlocks.astro updated.
