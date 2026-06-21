# Directus Conventions & Patterns

This document is the authoritative reference for all Directus-related work on this project.
Read it fully before creating or modifying any Directus collections, fields, or relations.

---

## Instance

- **URL**: `http://localhost:8055` (dev) — check `.env` for production
- **MCP server**: `mcp__barkomas_dev__*` tools (collections, fields, relations, items, schema, etc.)
- **SDK**: `@directus/sdk` v21+ in `frontend/src/lib/directus.ts`

---

## MCP Tool Rules & Gotchas

### Collections tool
- `schema: {}` → creates a real database table
- `schema: null` → folder/group collection (navigation only, no table)
- When creating a collection with `fields`, do **not** assume Directus auto-creates `id` — define it explicitly in the `fields` array with `schema: { is_primary_key: true, has_auto_increment: false }` for UUID PKs
- If you omit `id` from `fields`, Directus creates a serial integer PK automatically — which conflicts if you also specify a UUID `id` field

### Fields tool
- **Create**: include `field` in the `data` array items ✓
- **Update**: do **NOT** pass `field` as a top-level parameter — pass it only inside `data` items:
  ```json
  // correct
  { "action": "update", "collection": "my_col", "data": [{ "field": "my_field", "meta": { ... } }] }

  // wrong — causes "Unrecognized key: field" from Directus
  { "action": "update", "collection": "my_col", "field": "my_field", "data": [{ "meta": { ... } }] }
  ```
- **Delete**: use top-level `field` parameter ✓
- **Read single field**: use top-level `field` parameter ✓

### Relations tool
- Always create collections and their fields **before** creating relations (FK constraints need the table/column to exist)
- Each relation is one MCP call — parallel calls are safe when targeting different collection+field pairs
- For translations: always create **two** relations per junction table (see translations pattern below)

---

## Collection Design Patterns

### Primary Key (UUID)
Every main content collection uses UUID primary keys:
```json
{
  "field": "id",
  "type": "uuid",
  "meta": {
    "special": ["uuid"],
    "interface": "input",
    "readonly": true,
    "hidden": true,
    "sort": 1,
    "width": "full"
  },
  "schema": { "is_primary_key": true, "has_auto_increment": false }
}
```
Junction tables (`*_translations`, `*_files`) use integer auto-increment PKs:
```json
{
  "field": "id",
  "type": "integer",
  "meta": { "interface": null, "hidden": true, "sort": 1 },
  "schema": { "has_auto_increment": true, "is_primary_key": true }
}
```

### System Fields (always include on main collections)
```json
{ "field": "date_created", "type": "timestamp",
  "meta": { "special": ["date-created"], "interface": "datetime", "display": "datetime",
            "display_options": { "relative": true }, "readonly": true, "hidden": true },
  "schema": { "default_value": "CURRENT_TIMESTAMP", "is_nullable": true } },

{ "field": "user_created", "type": "uuid",
  "meta": { "special": ["user-created"], "interface": "select-dropdown-m2o",
            "options": { "template": "{{avatar}} {{first_name}} {{last_name}}" },
            "display": "user", "readonly": true, "hidden": true },
  "schema": { "is_nullable": true } },

{ "field": "date_updated", "type": "timestamp",
  "meta": { "special": ["date-updated"], "interface": "datetime", "display": "datetime",
            "display_options": { "relative": true }, "readonly": true, "hidden": true },
  "schema": { "is_nullable": true } },

{ "field": "user_updated", "type": "uuid",
  "meta": { "special": ["user-updated"], "interface": "select-dropdown-m2o",
            "options": { "template": "{{avatar}} {{first_name}} {{last_name}}" },
            "display": "user", "readonly": true, "hidden": true },
  "schema": { "is_nullable": true } }
```
Each needs a relation to `directus_users` with `on_delete: SET NULL`, `one_field: null`.

### Status Field
```json
{
  "field": "status", "type": "string",
  "meta": {
    "interface": "select-dropdown",
    "options": { "choices": [
      { "text": "$t:draft",     "value": "draft",     "icon": "draft_orders", "color": "#A2B5CD" },
      { "text": "In Review",    "value": "in_review", "icon": "rate_review",  "color": "#FFA439" },
      { "text": "$t:published", "value": "published", "icon": "check",        "color": "#2ECDA7" },
      { "text": "$t:archived",  "value": "archived",  "icon": "archive",      "color": "#C9C4C4" }
    ]},
    "display": "labels"
  },
  "schema": { "default_value": "draft", "is_nullable": false }
}
```
Omit `in_review` for non-editorial collections (categories, variants, etc.).
Always set on **collection meta**: `archive_field: "status"`, `archive_value: "archived"`, `unarchive_value: "draft"`.

### Slug Field
```json
{
  "field": "slug", "type": "string",
  "meta": {
    "interface": "extension-wpslug",
    "options": { "font": "monospace", "trim": true },
    "display": "formatted-value",
    "display_options": { "font": "monospace" },
    "note": "URL-safe identifier (auto-generated from translated name)."
  },
  "schema": { "is_nullable": true }
}
```

### Image Field (single file)
```json
{
  "field": "image", "type": "uuid",
  "meta": {
    "special": ["file"],
    "interface": "file-image",
    "options": { "crop": false, "folder": "ece7bab9-5433-4a63-b9f7-bde8b517d6d9" },
    "display": "image"
  },
  "schema": { "is_nullable": true }
}
```
**Image folder UUID**: `ece7bab9-5433-4a63-b9f7-bde8b517d6d9` — always use this.
Relation: `on_delete: SET NULL` — never CASCADE-delete files when content is deleted.

### Gallery Field (M2M files)
Alias field on the main collection:
```json
{
  "field": "gallery", "type": "alias",
  "meta": {
    "special": ["files"],
    "interface": "files",
    "options": { "folder": "ece7bab9-5433-4a63-b9f7-bde8b517d6d9" }
  },
  "schema": null
}
```
Requires a junction table `{collection}_files` with: `id` (int PK), `{collection}_id` (uuid), `directus_files_id` (uuid), `sort` (integer).
Relations: `{collection}_id → {collection}` with `one_field: "gallery"`, `junction_field: "directus_files_id"`, `sort_field: "sort"`, `on_delete: CASCADE`. Plus `directus_files_id → directus_files` with `on_delete: CASCADE`.

### SEO Field
```json
{
  "field": "seo", "type": "json",
  "meta": {
    "special": ["cast-json"],
    "interface": "seo-interface",
    "options": { "titleTemplate": "{{name}}", "showOgImage": true },
    "display": "seo-display",
    "display_options": { "showSearchPreview": true },
    "group": "meta_seo"
  },
  "schema": { "is_nullable": true }
}
```

### Tab Grouping — always apply for UX

Any collection with 5+ visible fields **must** use tab groups. Apply this when creating new collections and when adding fields to existing ones.

**Structure:**
```
meta_tabs        (type: alias, interface: group-tabs, group: null, sort: 2)
  meta_content   (type: alias, interface: group-raw,  group: meta_tabs, sort: 1)  ← default tab
  meta_seo       (type: alias, interface: group-raw,  group: meta_tabs, sort: N)  ← if collection has SEO
  meta_<name>    (type: alias, interface: group-raw,  group: meta_tabs, sort: N)  ← any extra logical group
```

Fields are assigned to a tab by setting `meta.group` to the tab's field name (e.g. `"group": "meta_content"`).

**How to create a tab container + tabs (batch):**
```json
[
  {
    "field": "meta_tabs",
    "type": "alias",
    "meta": { "special": ["alias","no-data","group"], "interface": "group-tabs", "options": {"fillWidth": true}, "sort": 2, "width": "full", "group": null },
    "schema": null
  },
  {
    "field": "meta_content",
    "type": "alias",
    "meta": { "special": ["alias","no-data","group"], "interface": "group-raw", "sort": 1, "width": "full", "translations": [{"language":"en-US","translation":"Content"}], "group": "meta_tabs" },
    "schema": null
  }
]
```

**Standard tab names and what goes in them:**

| Tab field | Label | Typical contents |
|---|---|---|
| `meta_content` | Content | status, slug, primary identity fields, images, translations, relations |
| `meta_catalog` | Catalog | category, brand, classification (eCl@ss, etc.) |
| `meta_relations` | Relations | tags, related items, certifications |
| `meta_specs` | Specifications | spec rows, highlights, media assets |
| `meta_commerce` | Commerce | pricing, RFQ, regional prices |
| `meta_extras` | Downloads & FAQ | documents, options/parts, FAQs |
| `meta_layout` | Layout | page_template, blocks (M2A page builder) |
| `meta_seo` | SEO | seo field — always last tab |

**Rules:**
- `meta_tabs` goes at `sort: 2` (after the `super-header` at sort 0, which stays at `group: null`).
- `meta_content` is always sort 1 within the tab container — it's the default open tab.
- `meta_seo` is always the last tab.
- `presentation-divider` fields are redundant inside tabs (the tab label already separates sections). Hide existing ones with `hidden: true` rather than deleting.
- Single-tab collections (only `meta_content`) still benefit from the tab wrapper — it keeps the layout consistent and makes it easy to add more tabs later.
- When adding a field to a collection that already has tabs, always set `"group": "<appropriate_tab>"` on the new field.

---

## Translations Pattern

### Structure
For a collection `posts`:
1. **`posts`** has an alias `translations` field
2. **`posts_translations`** is the junction table: `id`, `posts_id`, `languages_code`, + translatable fields

### Alias field on the parent collection
```json
{
  "field": "translations", "type": "alias",
  "meta": {
    "special": ["translations"],
    "interface": "translations",
    "options": {
      "languageField": "name",
      "languageDirectionField": "direction",
      "userLanguage": true
    },
    "display": "translations",
    "display_options": {
      "template": "{{name}}",
      "languageField": "name",
      "userLanguage": true
    },
    "hidden": false, "width": "full"
  },
  "schema": null
}
```
**Critical**: both `options.languageField` and `display_options.languageField` must be `"name"` (not `"code"`).
`"name"` references the `name` field in the `languages` collection — shows "English", "French", etc.
Using `"code"` shows "en-US", "fr-FR" — technically valid but inconsistent with project standard.

**Key rules:**
- `languageDirectionField: "direction"` must be in `options` — required for RTL languages (Arabic). Don't omit it.
- `template` in `display_options` should use the collection's primary human-readable field: `{{name}}` for categories/products, `{{title}}` for posts, `{{headline}}` for hero blocks, etc. This is what editors see when the widget is collapsed.
- `meta.translations` array sets the admin UI label for the field itself (e.g. `"translation": "Translations"` or the primary field name like `"Title"`).
- If the collection uses tab groups (`meta_content`), set `"group": "meta_content"` on this alias field too.

### Junction table fields
```json
{ "field": "id",               "type": "integer", "schema": { "has_auto_increment": true, "is_primary_key": true }, "meta": { "hidden": true } },
{ "field": "{collection}_id",  "type": "uuid",    "schema": { "is_nullable": true }, "meta": { "hidden": true } },
{ "field": "languages_code",   "type": "string",  "schema": { "is_nullable": true }, "meta": { "hidden": true } }
```
Then add the translatable content fields with full detail:
```json
{
  "field": "name",
  "type": "string",
  "meta": {
    "interface": "input",
    "options": { "placeholder": "e.g. Electronics" },
    "note": "Display name shown to visitors.",
    "required": true,
    "sort": 4,
    "width": "full"
  },
  "schema": { "is_nullable": true }
}
```
Use `"width": "half"` to visually pair two sibling fields (e.g. `title` + `description` side by side). Add `"required": true` on the primary name/title field. Always include a `note` and `placeholder` for editor UX.

### Two required relations on the junction table

**Relation 1** — `{collection}_id → {collection}` (wires the `translations` alias):
```json
{
  "collection": "{collection}_translations",
  "field": "{collection}_id",
  "related_collection": "{collection}",
  "schema": { "on_delete": "CASCADE" },
  "meta": {
    "many_collection": "{collection}_translations",
    "many_field": "{collection}_id",
    "one_collection": "{collection}",
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
  "collection": "{collection}_translations",
  "field": "languages_code",
  "related_collection": "languages",
  "schema": { "on_delete": "CASCADE" },
  "meta": {
    "many_collection": "{collection}_translations",
    "many_field": "languages_code",
    "one_collection": "languages",
    "one_field": null,
    "junction_field": "{collection}_id",
    "sort_field": null,
    "one_deselect_action": "nullify"
  }
}
```

Relations 1 and 2 are independent — create them in parallel via MCP.

**Verification checklist:**
- Directus admin shows the translations widget (not a raw field) on the edit form ✓
- Language labels show "English", "Arabic" etc. (not "en-US") ✓
- No "1 translation config could not be resolved" warning in the admin header ✓ — this warning means one or both relations above are missing or incomplete
- `translations.*` in the SDK query returns objects (not raw integer IDs) ✓ — if IDs come back, the **public Directus role lacks read permission** on the junction collection; fix in Settings → Access Policies → Public, never use a static token as a workaround

---

## Collection Grouping

Sidebar groups use folder collections (`schema: null`). Existing folders:
- `website` — pages, posts, forms, navigation, globals, redirects, form_submissions, ai_prompts
- `product_catalog` — product_categories, products, product_variants (and all their junction tables)

Set `group: "folder_name"` in collection meta. Hidden sub-tables nest under their parent:
e.g. `posts_translations` → `group: "posts"`, `product_variants` → `group: "products"`.

---

## Languages Collection

```
code (PK, string) | name (string) | direction ("ltr" | "rtl")
```
Current entries: `en-US`, `ar-SA`, `de-DE`, `es-ES`, `fr-FR`, `it-IT`, `pt-BR`, `ru-RU`.
All translation junction FKs point to `languages.code` with `on_delete: CASCADE`.

---

## Self-referential & O2M Relations

**Recursive categories** (`parent` / `children`):
```json
{
  "collection": "product_categories", "field": "parent",
  "related_collection": "product_categories",
  "schema": { "on_delete": "SET NULL" },
  "meta": { "one_field": "children", "sort_field": "sort", "one_deselect_action": "nullify" }
}
```

**O2M owned children** (variants, etc.):
```json
{
  "collection": "product_variants", "field": "product",
  "related_collection": "products",
  "schema": { "on_delete": "CASCADE" },
  "meta": { "one_field": "variants", "sort_field": "sort", "one_deselect_action": "delete" }
}
```
Use `on_delete: CASCADE` + `one_deselect_action: "delete"` when children are owned by the parent.
Use `on_delete: SET NULL` + `one_deselect_action: "nullify"` when the relation is optional.

---

## File & Image Operations via MCP

### Importing a file from a URL
Use `mcp__barkomas_dev__files` with `action: "import"`. The returned UUID is what you store in any `file`/`file-image` type field.

```json
{
  "action": "import",
  "data": [
    {
      "url": "https://example.com/image.jpg",
      "file": {
        "title": "Descriptive human title",
        "folder": "ece7bab9-5433-4a63-b9f7-bde8b517d6d9"
      }
    }
  ]
}
```

**Batch imports** — send up to 6 at a time (fly.dev has a request timeout; batches > 6 risk partial failures):
```json
{
  "action": "import",
  "data": [
    { "url": "https://…/img1.jpg", "file": { "title": "Image 1", "folder": "ece7bab9-5433-4a63-b9f7-bde8b517d6d9" } },
    { "url": "https://…/img2.png", "file": { "title": "Image 2", "folder": "ece7bab9-5433-4a63-b9f7-bde8b517d6d9" } }
  ]
}
```

Returns an array of file UUIDs in the same order as the input. **Save every UUID immediately** — you will need them to assign to collection fields.

### Assigning an imported file to a collection field
After import, update the item with the UUID:
```json
{
  "action": "update",
  "collection": "block_numbered_list",
  "keys": ["<item-uuid>"],
  "data": { "image": "<file-uuid>" }
}
```

Or pass the UUID inline when creating an item:
```json
{
  "action": "create",
  "collection": "block_hero_slider_slides",
  "data": [{ "image": "<file-uuid>", "video": "<video-file-uuid>", … }]
}
```

### Checking what files are already imported
Before importing, check if the file already exists to avoid duplicates:
```json
{
  "action": "read",
  "query": {
    "fields": ["id", "title", "filename_download"],
    "sort": ["-uploaded_on"],
    "limit": 50
  }
}
```

### File folder
All project media goes in folder `ece7bab9-5433-4a63-b9f7-bde8b517d6d9`. Always pass this in the `file.folder` key on import.

### Videos
Videos import the same way as images — `mcp__barkomas_dev__files` with `action: "import"`. The MIME type is inferred from the URL. Video file UUIDs go in `video` fields (type `uuid` with `special: ["file"]`), not image fields. They use the same Asset URL pattern below, minus the transform query params.

---

## Frontend SDK Patterns

### Translations field expansion
Use `"translations.*"` — **not** dot-notation like `"translations.title"`. The translations special type requires wildcard:
```ts
fields: ["id", "slug", "image", "translations.*"] as any[]
```

### M2A blocks expansion
```ts
"blocks.item:block_hero.translations.*"
"blocks.item:block_richtext.alignment"
```

### Type assertions
```ts
fields: [...] as any[]          // for M2A and dot-notation strings
result as unknown as MyType[]   // for SDK return types
```

### Singleton collections
```ts
directus.request(readSingleton("globals", { fields: ["title", "logo"] }))
```

### Public access and raw IDs
If `translations.*` returns raw IDs (`[3]` instead of objects), the **public Directus role lacks read permission** on the translation junction collection. Fix: Directus Admin → Settings → Access Policies → Public → grant read on the affected collection.
Never use a static token just to work around missing public permissions — fix the policy instead.

### Asset URLs
```ts
`${DIRECTUS_URL}/assets/${fileUuid}`
`${DIRECTUS_URL}/assets/${fileUuid}?width=800&height=450&fit=cover`
// Videos — no transform params, just the raw asset:
`${DIRECTUS_URL}/assets/${fileUuid}`
```
