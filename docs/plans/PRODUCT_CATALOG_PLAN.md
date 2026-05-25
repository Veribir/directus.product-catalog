# Product Catalog — Directus Design Plan

## Analysis: posts collection patterns to replicate

| Pattern | Detail |
|---|---|
| Primary key | UUID, `special: ["uuid"]`, readonly, hidden |
| System fields | `date_created`, `user_created`, `date_updated`, `user_updated` — all hidden, readonly, with correct specials |
| Status | `select-dropdown` with draft / in_review / published; archive setup on collection meta |
| Slug | `extension-wpslug` interface, monospace font, trim option |
| Image (single) | `uuid` type, `special: ["file"]`, `file-image` interface, folder-restricted |
| Translations | `alias` field, `special: ["translations"]`, `translations` interface with `languageField: "name"`, `languageDirectionField: "direction"`, `userLanguage: true` |
| Translation junction | `id` (int auto-inc) + `{collection}_id` (UUID FK, CASCADE delete) + `languages_code` (string FK, CASCADE delete) + translatable fields |
| Relation (translations) | Two relations: `{collection}_id → {collection}` with `one_field: "translations"`, `junction_field: "languages_code"`, `one_deselect_action: "delete"` and `languages_code → languages` with `junction_field: "{collection}_id"` |
| SEO | `json` type, `special: ["cast-json"]`, `seo-interface` |
| Display template | `{{translations}}` to show translated name |
| Versioning | `true` on main content collections |
| Sort | `sort` integer field, hidden |
| Super header | `alias` with `presentation-notice` / `super-header` interface for admin UX |
| Image folder | `ece7bab9-5433-4a63-b9f7-bde8b517d6d9` |

---

## Collections to create

### 1. `product_catalog` (folder — nav group)
Folder collection, `schema: null`. Groups all product collections in sidebar.

---

### 2. `product_categories`
Hierarchical categories. Recursive via `parent` M2O self-reference.

**Fields:**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK, auto, hidden |
| `sort` | integer | Hidden, used for manual ordering |
| `status` | string | draft / published / archived |
| `slug` | string | URL-safe, monospace, auto-generated from translated name |
| `parent` | UUID | M2O → self (`product_categories`), nullable — enables multi-layer hierarchy |
| `image` | UUID | Featured category image, M2O → directus_files |
| `date_created` | timestamp | System, hidden |
| `user_created` | UUID | System, hidden |
| `date_updated` | timestamp | System, hidden |
| `user_updated` | UUID | System, hidden |
| `translations` | alias | O2M via product_categories_translations |
| `children` | alias | O2M back-reference (subcategories) |

**Relations:**
- `parent` M2O → `product_categories` (self, SET NULL on delete)
- `image` M2O → `directus_files`
- `children` O2M alias from self

---

### 3. `product_categories_translations`
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Auto-inc PK |
| `product_categories_id` | UUID | FK → product_categories, CASCADE |
| `languages_code` | string | FK → languages, CASCADE |
| `name` | string | Required. Category display name |
| `description` | text | Short category description |

---

### 4. `products`
Main product collection.

**Fields:**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `sort` | integer | Hidden |
| `status` | string | draft / in_review / published / archived |
| `slug` | string | URL-safe slug |
| `sku` | string | Stock Keeping Unit, monospace, unique |
| `price` | decimal | Base product price |
| `compare_at_price` | decimal | Original/crossed-out price for sale display |
| `category` | UUID | M2O → product_categories |
| `image` | UUID | Featured image, M2O → directus_files |
| `gallery` | alias | M2M → directus_files via products_files junction |
| `date_created` | timestamp | System, hidden |
| `user_created` | UUID | System, hidden |
| `date_updated` | timestamp | System, hidden |
| `user_updated` | UUID | System, hidden |
| `seo` | json | SEO metadata |
| `translations` | alias | O2M via products_translations |
| `variants` | alias | O2M → product_variants |

---

### 5. `products_files` (gallery junction)
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Auto-inc PK |
| `products_id` | UUID | FK → products, CASCADE |
| `directus_files_id` | UUID | FK → directus_files |
| `sort` | integer | Manual image ordering |

---

### 6. `products_translations`
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Auto-inc PK |
| `products_id` | UUID | FK → products, CASCADE |
| `languages_code` | string | FK → languages, CASCADE |
| `name` | string | Required. Product display name |
| `description` | text | Short product description (used in cards/SEO) |
| `content` | text | Rich text HTML — full product details |

---

### 7. `product_variants`
Each row is one variant of a product (e.g. Red / XL). Multiple variants per product.

**Fields:**
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `sort` | integer | Hidden, for ordering variants |
| `status` | string | draft / published / archived |
| `product` | UUID | M2O → products |
| `sku` | string | Variant-level SKU |
| `price` | decimal | Overrides product base price when set |
| `compare_at_price` | decimal | Variant-level compare price |
| `stock` | integer | Inventory count |
| `image` | UUID | Variant-specific image, M2O → directus_files |
| `options` | json | Array of `{attribute, value}` e.g. `[{attribute:"Color",value:"Red"}]` |
| `date_created` | timestamp | System, hidden |
| `user_created` | UUID | System, hidden |
| `date_updated` | timestamp | System, hidden |
| `user_updated` | UUID | System, hidden |
| `translations` | alias | O2M via product_variants_translations |

---

### 8. `product_variants_translations`
| Field | Type | Notes |
|---|---|---|
| `id` | integer | Auto-inc PK |
| `product_variants_id` | UUID | FK → product_variants, CASCADE |
| `languages_code` | string | FK → languages, CASCADE |
| `name` | string | Variant display name e.g. "Red / XL" |

---

## Implementation order

1. `product_catalog` folder
2. `product_categories` collection + fields
3. `product_categories_translations` collection + fields
4. Relations: product_categories self-ref, image, translations
5. `products` collection + fields
6. `products_files` junction + fields
7. `products_translations` collection + fields
8. Relations: products → category, image, gallery, translations, variants
9. `product_variants` collection + fields
10. `product_variants_translations` collection + fields
11. Relations: variants → product, image, translations

## Status

- [x] Plan written
- [x] product_catalog folder
- [x] product_categories
- [x] product_categories_translations
- [x] product_categories relations (self-ref parent/children, image, user_created, user_updated, translations)
- [x] products (with tabs: Content / SEO)
- [x] products_files (gallery junction)
- [x] products_translations
- [x] products relations (category, image, gallery M2M, user_created, user_updated, translations, variants O2M)
- [x] product_variants
- [x] product_variants_translations
- [x] product_variants relations (product O2M→CASCADE, image, user_created, user_updated, translations)

**All 8 collections + 1 junction + 19 FK relations created.**
