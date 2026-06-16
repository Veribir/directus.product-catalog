---
description: Scaffold a full new Directus collection with UUID PK, system fields, status, slug, translations, and correct sidebar grouping.
argument-hint: "<collection_name> [parent_folder] [notes about the collection]"
---

# directus-new-collection

Create a complete new Directus collection following project conventions from `.claude/directus.md`.

## Input

`$ARGUMENTS` — collection name (snake_case), optional parent folder (`website` or `product_catalog`), and any notes.

## Steps

### 1 — Gather context

Before creating anything:
- Use `mcp__barkomas_dev__collections` (`action: "read"`) to see all existing collections and their group assignments
- Read `.claude/directus.md` fully if not already in context — it documents all field patterns, translations, and relation rules
- If the new collection belongs to the `product_catalog` folder, read `docs/product-catalog-schema-guide.md` first to understand the existing schema structure and avoid duplicating or conflicting with established patterns (lookup tables, junction conventions, enum values)

### 2 — Create the main collection

Use `mcp__barkomas_dev__collections` with `action: "create"`. Always include these fields in the `fields` array:

**Required fields (in order)**:
1. `id` — UUID PK (see directus.md → Primary Key section)
2. `status` — select-dropdown with draft/in_review/published/archived
3. `sort` — integer, hidden, `meta: { interface: "input", hidden: true, sort: 3 }`
4. `user_created`, `date_created`, `user_updated`, `date_updated` — system fields (see directus.md)
5. `slug` — extension-wpslug, monospace (see directus.md)

**Collection meta**:
```json
{
  "icon": "box",
  "color": null,
  "archive_field": "status",
  "archive_value": "archived",
  "unarchive_value": "draft",
  "sort_field": "sort",
  "group": "<parent_folder>"
}
```

### 3 — Create the translations junction table

Collection name: `<collection>_translations`

Fields:
```json
[
  { "field": "id",                 "type": "integer", "schema": { "has_auto_increment": true, "is_primary_key": true }, "meta": { "hidden": true, "sort": 1 } },
  { "field": "<collection>_id",   "type": "uuid",    "schema": { "is_nullable": true }, "meta": { "hidden": true, "sort": 2 } },
  { "field": "languages_code",     "type": "string",  "schema": { "is_nullable": true }, "meta": { "hidden": true, "sort": 3 } },
  { "field": "name",               "type": "string",  "schema": { "is_nullable": true }, "meta": { "interface": "input", "sort": 4, "width": "full" } }
]
```

Collection meta: `{ "group": "<collection>", "hidden": true }`

### 4 — Add the translations alias field to the main collection

Use `mcp__barkomas_dev__fields` with `action: "create"` on `<collection>`:
```json
{
  "field": "translations",
  "type": "alias",
  "meta": {
    "special": ["translations"],
    "interface": "translations",
    "options": {
      "languageField": "name",
      "languageDirectionField": "direction",
      "userLanguage": true
    },
    "display": "translations",
    "display_options": { "template": "{{name}}", "languageField": "name", "userLanguage": true },
    "hidden": false,
    "width": "full",
    "sort": 10
  },
  "schema": null
}
```

**Critical**: `languageField` must be `"name"` (not `"code"`) — both in options and display_options.

### 5 — Create the two relations on the junction table

**Relation 1** — `<collection>_id → <collection>` (wires the translations alias):
```json
{
  "collection": "<collection>_translations",
  "field": "<collection>_id",
  "related_collection": "<collection>",
  "schema": { "on_delete": "CASCADE" },
  "meta": {
    "many_collection": "<collection>_translations",
    "many_field": "<collection>_id",
    "one_collection": "<collection>",
    "one_field": "translations",
    "junction_field": "languages_code",
    "sort_field": null,
    "one_deselect_action": "delete"
  }
}
```

**Relation 2** — `languages_code → languages`:
```json
{
  "collection": "<collection>_translations",
  "field": "languages_code",
  "related_collection": "languages",
  "schema": { "on_delete": "CASCADE" },
  "meta": {
    "many_collection": "<collection>_translations",
    "many_field": "languages_code",
    "one_collection": "languages",
    "one_field": null,
    "junction_field": "<collection>_id",
    "sort_field": null,
    "one_deselect_action": "nullify"
  }
}
```

Both relations are independent — they can be created in parallel.

### 6 — Create system field relations (user_created, user_updated → directus_users)

For each of `user_created` and `user_updated`, create a relation with `on_delete: SET NULL`, `one_field: null`.

### 7 — Verify

- Read back the main collection meta to confirm `archive_field`, `group`
- Read the `translations` alias field to confirm it was created
- Report: collection name, junction table, fields created, relations wired
- If Directus admin shows "1 translation config could not be resolved" — check that both relations (steps 5a and 5b) were created correctly

### 8 — Frontend wiring (inform user)

After schema is done, remind the user of the frontend steps required:
1. Add types to `frontend/src/lib/types.ts`
2. Add a fetch function to `frontend/src/lib/api.ts`
3. Export new types from `frontend/src/lib/directus.ts`
4. Import and use the new collection in the relevant Astro page or component
