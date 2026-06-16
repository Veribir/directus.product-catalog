---
description: Read live Directus schema via MCP and verify/update frontend/src/lib/types.ts to match — flags missing fields, wrong nullable annotations, and stale types.
argument-hint: "[collection_name] — optional, limit sync to one collection"
---

# sync-types

Verify that `frontend/src/lib/types.ts` is in sync with the live Directus schema. Flags gaps and optionally fixes them.

## Input

`$ARGUMENTS` — optional collection name to limit scope. If empty, checks all collections that have TypeScript types defined.

## Steps

### 1 — Read current types

Read `frontend/src/lib/types.ts` in full. Build a mental map of:
- Which Directus collections have a TypeScript type
- What fields each type declares and their nullability

### 2 — Read live Directus schema

For each relevant collection (or the one named in `$ARGUMENTS`), use `mcp__barkomas_dev__fields` with `action: "read"` to get the full field list with their types and nullable annotations.

Key collections to check:

**Site / content**
- `globals`, `pages`, `posts`, `navigation`
- Block collections: `block_hero`, `block_richtext`, `block_posts`, `block_cta_banner`, `block_numbered_list`, `block_features_grid`, `block_brands_logos`

**Product catalog** (see `docs/product-catalog-schema-guide.md` for the full schema overview)
- Lookups: `product_units`, `product_brands`, `product_regions`, `customer_groups`, `product_tags`, `product_certifications`, `product_spec_groups`
- Templates: `product_page_templates`, `product_page_tabs`
- Catalog: `product_categories`, `products`, `product_variants`
- Specs: `product_specs`, `product_spec_variant_values`
- Pricing: `product_pricing_tiers`, `product_regional_prices`, `product_rfq_requests`
- Per-product content: `product_media`, `product_highlights`, `product_options`, `product_documents`, `product_faqs`
- Product layout blocks: `block_product_hero`, `block_product_gallery`, `block_product_buybox`, `block_product_description`, `block_product_specs`, `block_product_card_grid`, `block_product_cta_group`, `block_product_options`, `block_product_documents`, `block_product_faq`, `block_product_pricing_table`, `block_product_related`, `block_product_content_slot`
- Category/product general blocks: `block_products`, `block_product_categories`, `block_product_category_cards`
- Translation junctions for each of the above

### 3 — Compare and report gaps

For each collection, report:
- **Missing from types.ts**: fields that exist in Directus but have no TypeScript property
- **Extra in types.ts**: properties declared in TypeScript but not found in Directus (possibly removed)
- **Nullability mismatch**: Directus says `is_nullable: true` but TS type uses non-nullable (or vice versa)
- **Type mismatch**: e.g. Directus `integer` mapped as `string` in TS

### 4 — Fix gaps (with confirmation)

For each gap found:
- If clearly missing: add the field to the appropriate type in `types.ts`
- If extra/stale: flag it for the user (don't auto-delete — may be intentional frontend-only enrichment)
- If nullability wrong: fix the `| null` annotation

**Type mapping rules** (Directus → TypeScript):
| Directus type | TypeScript |
|---|---|
| `string` | `string` |
| `integer` / `bigInteger` | `number` |
| `float` / `decimal` | `number` |
| `boolean` | `boolean` |
| `uuid` | `string` |
| `timestamp` / `dateTime` | `string` (ISO date string) |
| `json` | `Record<string, unknown>` or specific interface |
| `alias` (no-data special) | omit from type (group fields, dividers) |
| `alias` (translations special) | `XTranslation[]` |
| `alias` (files special) | `{ id: string; directus_files_id: string }[]` |

Fields with `special: ["alias", "no-data"]` (dividers, tabs) do not need TypeScript properties.

### 5 — Update `api.ts` fetch functions (if needed)

If new fields were added to `types.ts`, check whether the corresponding `fetchXxx()` function in `api.ts` includes those fields. If not, add them to the fields array — remembering:
- Use `"translations.*"` (not dot-notation) for translation fields
- For relations, use `"relation_field.sub_field"` dot-notation
- M2A block fields use `"blocks.item:block_name.field_name"` pattern

### 6 — Report

Output a summary table:
- Collections checked
- Fields added / fixed
- Fields flagged for user review (stale or ambiguous)
- Any `api.ts` additions needed
