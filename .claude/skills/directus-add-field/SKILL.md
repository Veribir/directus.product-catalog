---
description: Add one or more fields to a Directus collection using MCP, following project conventions.
argument-hint: "<collection> <field_name> <type> [notes about the field]"
---

# directus-add-field

Add fields to an existing Directus collection via MCP, following the conventions in `.claude/directus.md`.

## Input

`$ARGUMENTS` — space-separated: collection name, field name, field type, plus any free-form notes
(e.g. `products weight decimal nullable, shown in product detail`)

## Steps

### 1 — Read current field state

Use `mcp__barkomas_dev__fields` with `action: "read"` on the target collection so you know:
- existing sort numbers (to place the new field at the right position)
- existing group names (to put the field inside the right tab group)
- any section dividers that already exist

Also read `.claude/directus.md` if you haven't in this session — it is the authoritative source for all interface/meta patterns.

### 2 — Determine field configuration

Apply the following rules to choose the correct interface and meta:

| Situation | Interface | Extra meta |
|---|---|---|
| Short code / ID (slug, IRDI, SKU, eCl@ss) | `input` | `options: { font: "monospace" }` |
| Long free text | `input` | none |
| Multiline text | `input-multiline` | none |
| Number | `input` | none |
| Boolean | `boolean` | none |
| Date / timestamp | `datetime` | `display: "datetime"` |
| Select from fixed choices | `select-dropdown` | `options: { choices: [...] }` |
| Relation (M2O) | `select-dropdown-m2o` | see directus.md |
| Rich text (HTML) | `input-rich-text-html` | none |
| JSON blob | `input-code` | `options: { language: "json" }` |
| Image (single) | `file-image` | `options: { folder: "ece7bab9-5433-4a63-b9f7-bde8b517d6d9" }` |

**Width**: default `"full"`. Use `"half"` only when two sibling fields naturally pair (e.g. price + compare_at_price).

**Nullable**: most new fields should have `schema: { is_nullable: true }`. Only set `is_nullable: false` for required fields that have a default value.

**Tab group assignment**: always check whether the collection uses tabs (`group-tabs` / `group-raw` fields). If it does, assign the new field to the appropriate tab via `"group": "<tab_field_name>"` in meta. If no tabs exist yet and the collection has 5+ visible fields, create the tab structure first (see `barkomas.md` → "Tab grouping").

Standard tab assignment rules (see `barkomas.md` for the full table):
- Identity/core fields (status, slug, name, image, translations) → `meta_content`
- Category, brand, classification → `meta_catalog`
- Tags, related items, certifications → `meta_relations`
- Specs, highlights, media assets → `meta_specs`
- Pricing, RFQ → `meta_commerce`
- Documents, FAQs, options → `meta_extras`
- Page template, blocks → `meta_layout`
- SEO field → `meta_seo` (always last)

**Placement dividers**: if adding a new logical section, first create a `presentation-divider` field one sort position before the content fields:
```json
{
  "field": "meta_divider_<section>",
  "type": "alias",
  "meta": {
    "interface": "presentation-divider",
    "options": { "title": "<Section Title>", "color": "#6644AA" },
    "special": ["alias", "no-data"],
    "sort": <N>,
    "width": "full"
  },
  "schema": null
}
```

### 3 — Create the field

Use `mcp__barkomas_dev__fields` with `action: "create"`:

```json
{
  "action": "create",
  "collection": "<collection>",
  "data": [
    {
      "field": "<field_name>",
      "type": "<type>",
      "meta": {
        "interface": "<interface>",
        "options": { ... },
        "note": "<short admin note>",
        "sort": <N>,
        "width": "full",
        "group": "<group_if_applicable>"
      },
      "schema": {
        "is_nullable": true
      }
    }
  ]
}
```

**CRITICAL — update rule**: When updating existing fields, do NOT pass `field` as a top-level parameter — it must be inside `data` items only. See `.claude/directus.md` → "Fields tool" section.

### 4 — Verify

Read the field back with `mcp__barkomas_dev__fields` (`action: "read"`, supply `field`) and confirm it was created with the expected interface and sort order.

### 5 — Frontend wiring (schema change cascade)

A Directus field is not "done" until all three layers agree. Missing any one causes either a TypeScript error (missing type) or silent data gaps (field never fetched) — this is the most common mistake.

1. **Directus** — field created via MCP ✓ (steps 1–4)
2. **`frontend/src/lib/types.ts`** — add the property to the right type with correct nullability (`| null` for nullable fields).
3. **`frontend/src/lib/api.ts`** — add the field string to the relevant fetch function's fields array (e.g. `PAGE_FIELDS`, `PRODUCT_DETAIL_FIELDS`, `BLOCK_ITEM_FIELDS`).

If the field must appear in the UI, also update the component that renders it. Then run `npm run build` from `frontend/` to verify.

### 6 — Report

Report: collection name, field name, interface used, sort position, group assignment (if any), and which frontend layers were updated.
