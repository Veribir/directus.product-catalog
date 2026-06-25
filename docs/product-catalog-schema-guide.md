# Product Catalog Schema — Guide & Reference

> Birds-eye view of the product catalog data model in Directus.
> For the authoritative SQL, see `directus/schema/product-catalog-schema.sql`.

---

## Design Principles

| Principle | What it means in practice |
|---|---|
| **Content vs. Presentation** | Products, categories, specs, highlights, documents, FAQs hold pure *data*. How that data looks on the page is controlled entirely by layout block collections. |
| **Generic content buckets** | Per-product content (`product_media`, `product_highlights`, `product_options`, `product_documents`, `product_faqs`) are design-agnostic. Any Astro template can read them — adding a new page design never requires new Directus collections. |
| **Reusable page templates** | A `product_page_template` is a named set of tabs → blocks. Assign the same template to 100 products and change the layout in one place. |
| **Per-product overrides** | A product can append or override blocks from its template via its own `product_blocks` junction — without touching the shared template. |
| **Translatable where user-visible** | Every collection with user-visible strings has a companion `*_translations` table. Machine identifiers (`slug`, `code`, `key`) are never translated. |

---

## Collection Groups

Directus groups these under the **`product_catalog`** folder in the sidebar.

### 1. Lookup / Supporting

Small reference tables. Editors set these up once and reuse them everywhere.

| Collection | Purpose |
|---|---|
| `product_units` | Units of measure — kg, pcs, m², etc. Used on products, variants, specs, and pricing tiers. |
| `product_brands` | Manufacturers / brand identity (logo, website). Referenced by products and categories. |
| `product_regions` | Geographic regions with a currency and country list. Drive regional pricing. |
| `customer_groups` | Customer segments (wholesale, distributor, retail) for tiered pricing and RFQ. |
| `product_tags` | Loose keywords for flexible filtering and FAQ tagging. Distinct from hierarchical categories. |
| `product_certifications` | Industry/compliance certifications (CE, RoHS, ISO 9001). Linked to products via M2M. |
| `product_spec_groups` | Named organizers for spec rows (e.g. "Electrical", "Physical Dimensions"). Product-agnostic — one group is shared across products (`is_global`, or linked to a subset via the `products_spec_groups` M2M). |

All of the above have `*_translations` companions.

---

### 2. Product Page Templates

Controls how a product detail page is structured — section order, tabs, and which layout blocks appear.

```
product_page_templates
  └── product_page_tabs (ordered by sort)
        └── product_template_blocks (M2A → layout block collections)
```

| Collection | Purpose |
|---|---|
| `product_page_templates` | Named, reusable layout blueprint (e.g. "Heavy Machinery — Standard"). |
| `product_page_tabs` | Tabs within a template. A single tab = flat layout (no tab nav shown). Each has a machine `key` (e.g. `overview`, `specifications`) and a translated `label`. |
| `product_template_blocks` | Ordered list of layout blocks per tab. This is the M2A junction — `collection` + `item` point into one of the `block_product_*` collections. |

**Allowed block types in `product_template_blocks`:**
`block_product_hero`, `block_product_gallery`, `block_product_buybox`, `block_product_description`, `block_product_specs`, `block_product_card_grid`, `block_product_cta_group`, `block_product_options`, `block_product_documents`, `block_product_faq`, `block_product_pricing_table`, `block_product_related`, `block_product_content_slot`

---

### 3. Categories

Hierarchical tree. Each category can have a banner, a default page template, and its own page-builder blocks.

```
product_categories (self-referencing parent → children)
  ├── product_categories_translations
  └── product_category_blocks (M2A → general + product block types)
```

| Field | Notes |
|---|---|
| `parent` | Self-reference. Unlimited nesting depth. |
| `default_page_template` | Applied to products in this category that don't set their own template. |
| `listing_layout` | `grid_3 \| grid_4 \| grid_2 \| list` — how products are shown in the category listing. |
| `show_subcategories_bar` | Toggle the subcategory filter bar on the listing page. |
| `eclass_code / eclass_version` | eCl@ss classification. Products can override at the product level. |

---

### 4. Products

The core catalog item.

```
products
  ├── products_translations
  ├── product_variants          (o2m, cascades on delete)
  ├── product_specs             (o2m, cascades on delete)
  ├── product_pricing_tiers     (o2m, cascades on delete)
  ├── product_regional_prices   (o2m, cascades on delete)
  ├── product_media             (o2m, cascades on delete)
  ├── product_highlights        (o2m, cascades on delete)
  ├── product_options           (o2m, cascades on delete)
  ├── product_documents         (o2m, cascades on delete)
  ├── product_faqs              (o2m, cascades on delete)
  ├── product_blocks            (o2m, M2A junction — per-product layout)
  ├── products_files            (M2M → directus_files — gallery)
  ├── products_categories       (M2M → product_categories — secondary categories)
  ├── products_certifications   (M2M → product_certifications)
  ├── products_related          (self-M2M → products)
  └── products_tags             (M2M → product_tags)
```

**Key product fields:**

| Field | Notes |
|---|---|
| `slug` | URL-safe identifier. Translatable override via `products_translations.slug`. |
| `sku` | Internal catalog code. |
| `price / compare_at_price` | Base price. Overridden by variants, tiers, or regional prices. |
| `category` | Primary category (FK). Additional categories via `products_categories` M2M. |
| `page_template` | Points to `product_page_templates`. Falls back to `category.default_page_template`. |
| `product_type` | `standard \| consumable \| service \| configurable` |
| `rfq_enabled` | Enables the RFQ flow for this product. |
| `display_title` *(translation)* | Public-facing title (falls back to `name`). Useful when `name` is an internal code like "BM-0045". |

---

### 5. Variants

Each product can have multiple purchasable variants (e.g. Red / XL).

| Collection | Purpose |
|---|---|
| `product_variants` | SKU, price override, stock, image, and a JSON `options` field (`[{ attribute, value }]`). |
| `product_variants_translations` | Translated display name (e.g. "Red / XL"). |

---

### 6. Specs

Technical specification rows. The spec matrix (spec rows × variant columns) is **one
dataset editable from two doors** — the product OR the variant — see "Editing specs"
below.

```
product_spec_groups  (PRODUCT-AGNOSTIC — one group shared across many products)
  ├── is_global = true  → offered on every product
  ├── products (M2M, products_spec_groups) → non-global group scoped to a subset
  ├── (referenced by) product_specs.group
  └── specs            (reverse o2m — every spec across any product using this group; reference-only)

products
  ├── spec_groups (M2M → product_spec_groups — non-global groups offered on this product)
  └── product_specs (o2m — one spec row per product; `product` is nullable, backfilled by Flow)
        ├── product_specs_translations (label, value, note)
        └── product_spec_variant_values (one cell per spec × variant combination)
              └── (reverse o2m) product_variants.specs — this variant's spec sheet, editable from the variant
```

| Collection | Purpose |
|---|---|
| `product_specs` | One row per spec (display_type: `text \| boolean \| number \| range \| list`). `product` is nullable. |
| `product_spec_variant_values` | Comparison-table cell: spec × variant value. |
| `products_spec_groups` | M2M junction — links non-global groups to the products that may use them. |

**Spec groups are product-agnostic.** There is no per-product ownership column. A group
is offered on a product when `is_global = true` (every product) **or** it is linked to
that product via the `products_spec_groups` M2M. The same "Drilling Capacity" group is
reused across the whole product line rather than recreated per product.

**Editing specs — two doors (same rows):**
- **Product door** — `products.specs`: define a spec (group + label + unit + base value)
  with its per-variant values nested under it.
- **Variant door** — `product_variants.specs`: open a variant and fill in *its* value per
  spec, or inline-create a new spec (and group). A spec created here has no `product` yet;
  the **"Spec → backfill product from variant"** Flow sets `product_specs.product` from the
  variant's product on save. Both doors write to the same `product_specs` /
  `product_spec_variant_values` rows — one canonical definition, no duplication.

---

### 7. Pricing

Three layers of pricing, resolved in order:

```
Base price (products.price / product_variants.price)
  → product_pricing_tiers   (quantity + customer group tiers)
  → product_regional_prices (currency + region overrides)
```

| Collection | Purpose |
|---|---|
| `product_pricing_tiers` | `min_quantity / max_quantity / price / customer_group`. Null `variant` = applies to all variants. |
| `product_regional_prices` | Per-region price. Currency comes from `product_regions`. |
| `product_regions` | Region definition: ISO 4217 currency + country list (JSON). |
| `product_rfq_requests` | Inbound quote requests. States: `pending → reviewing → quoted → accepted / rejected / expired`. |

---

### 8. Generic Per-Product Content

These are **pure data** — no layout/presentation fields. Any Astro design reads them and decides how to render.

| Collection | `kind` / `category` values | Used for |
|---|---|---|
| `product_media` | `purpose`: `spec_drawing \| diagram \| certificate \| datasheet \| other` | Engineering drawings, diagrams, download images |
| `product_highlights` | `kind`: `highlight \| capability \| feature \| stat` | Key features list, capability grids, quick stat badges |
| `product_options` | `category`: `standard \| optional \| spare` | Parts & Options / Standard Equipment section |
| `product_documents` | `category`: `engineering_drawings \| cae_data \| software_firmware \| tender_specs \| other` | Document Vault / Downloads |
| `product_faqs` | — (tagged via `product_faqs_product_tags` M2M) | Knowledge Base & FAQ section |

---

### 9. Page-Builder M2A Junctions

Three M2A junctions wire block collections to their owners.

| Junction | Owner | What it connects |
|---|---|---|
| `product_blocks` | `products` | Per-product custom blocks or per-product overrides of template defaults |
| `product_category_blocks` | `product_categories` | Blocks above/below the implicit product grid on category landing pages |
| `product_template_blocks` | `product_page_tabs` | Template-level layout blocks (shared across all products using the template) |

All three have `collection` (block type name) + `item` (block PK) — no foreign key constraint (Directus M2A polymorphic). `product_blocks` and `product_category_blocks` also have `hide_block` and `background` (`light | dark`).

---

### 10. Product Layout Block Collections

Config-only blocks — they define **how** to render data, not the data itself. Placed inside `product_template_blocks` (or `product_blocks` for per-product overrides).

| Collection | What it renders | Key config fields |
|---|---|---|
| `block_product_hero` | Hero / title area | `image_position`, `cta_style`, `show_tagline`, `show_stats` |
| `block_product_gallery` | Image gallery | `layout` (`thumbnails \| carousel \| grid`), `enable_zoom` |
| `block_product_buybox` | Price / brand / SKU / variants | `show_price`, `show_brand`, `show_variants`, `layout` |
| `block_product_description` | Rich-text description | `style` (`default \| with_sidebar`) |
| `block_product_specs` | Spec table / accordion | `layout` (`table \| accordion \| comparison_table \| ...`), `spec_group` (filter to one group), `show_media` |
| `block_product_card_grid` | Cards for highlights / certifications / options / custom | `source`, `display_style`, `columns`, `limit` |
| `block_product_cta_group` | CTA button group | `layout` (`inline \| stacked`) → child `block_product_cta_group_buttons` |
| `block_product_options` | Parts & Optional Equipment | `show_category_filters`, `show_price`, `columns` |
| `block_product_documents` | Document Vault | `display_style` (`accordion \| flat_list`), `group_by_category` |
| `block_product_faq` | FAQ / Knowledge Base | `show_tag_filters` |
| `block_product_pricing_table` | Volume pricing table | `display_style` (`table \| cards`) |
| `block_product_related` | Related products carousel/grid | `layout`, `limit` |
| `block_product_content_slot` | Marker — "inject product_blocks here" | No config. Position in tab sort IS the config. |

> `block_product_specs` and `block_product_card_grid` are the only two layout blocks allowed in **both** `product_template_blocks` (shared default) AND `product_blocks` (per-product override).

---

### 11. General Page-Builder Blocks (product/category context)

These blocks live in the main `blocks` folder and are reused across pages, categories, and product pages.

| Collection | Used on |
|---|---|
| `block_products` | Render a grid/list of products — filtered by category, sorted, limited |
| `block_product_categories` | Render a grid/list of product categories |
| `block_product_category_cards` | Large visual category card grid (brand landing pages) |
| `block_features_grid` | Icon/text feature grid with optional showcase image |
| `block_hero`, `block_richtext`, `block_cta_banner`, etc. | Standard page-builder blocks (not product-specific) |

---

## Directus UX Flow

### Creating a new product end-to-end

```
1. Lookup setup (one-time)
   ├── product_units        → define units (kg, pcs, m²...)
   ├── product_brands       → add brand + logo
   ├── product_spec_groups  → create spec group labels
   ├── product_regions      → define regions + currency
   └── customer_groups      → define pricing segments

2. Template setup (per design, not per product)
   ├── product_page_templates → create template (e.g. "Standard Machinery")
   ├── product_page_tabs      → add tabs (overview / specifications / downloads)
   └── product_template_blocks → add + order layout blocks per tab
         e.g. tab "overview":
              block_product_hero (image_position=right, show_stats=true)
              block_product_description
              block_product_card_grid (source=highlights)
              block_product_content_slot  ← injects per-product blocks here
         e.g. tab "specifications":
              block_product_specs (layout=comparison_table, show_media=true)
         e.g. tab "downloads":
              block_product_documents

3. Category setup
   ├── product_categories    → create hierarchy (parent → children)
   └──                       → assign default_page_template

4. Product entry
   ├── products              → slug, SKU, price, category, brand, template
   ├── products_translations → name, display_title, description, content
   ├── product_variants      → SKU/price/stock overrides per variant
   ├── product_specs         → spec rows (label + value, grouped)
   ├── product_spec_variant_values → per-variant spec cell overrides
   ├── product_pricing_tiers → volume / segment price rules
   ├── product_regional_prices → per-region overrides
   ├── product_media         → engineering drawings / diagrams
   ├── product_highlights    → feature callouts / stat badges
   ├── product_options       → parts & accessories
   ├── product_documents     → downloadable files
   └── product_faqs          → Q&A, tagged with product_tags

5. Per-product layout overrides (optional)
   └── product_blocks        → add or override blocks for this product only
         e.g. one product needs comparison_accordion instead of table
              → add block_product_specs here with that layout
```

---

## Key Relationships at a Glance

```
product_page_templates ──< product_page_tabs ──< product_template_blocks >── block_product_*

product_categories (self-tree)
  ├── default_page_template → product_page_templates
  └──< product_category_blocks >── block_* (hero, richtext, features, etc.)

products
  ├── category       → product_categories
  ├── page_template  → product_page_templates (overrides category default)
  ├── brand          → product_brands
  ├── unit           → product_units
  ├──< product_variants ──< product_spec_variant_values (reverse: variants.specs — variant door)
  ├── >< product_spec_groups (M2M products_spec_groups — non-global groups offered on this product)
  ├──< product_specs ──< product_spec_variant_values >── product_variants
  │     ├── product → products (nullable; backfilled by Flow from the variant)
  │     └── group → product_spec_groups (is_global or M2M; reverse: groups.specs)
  ├──< product_pricing_tiers   →? product_variants, →? customer_groups
  ├──< product_regional_prices →? product_variants, → product_regions
  ├──< product_media
  ├──< product_highlights
  ├──< product_options
  ├──< product_documents
  ├──< product_faqs >── product_tags (M2M)
  ├──< product_blocks >── block_product_* (per-product M2A)
  ├── >< product_categories (M2M — secondary categories)
  ├── >< product_certifications (M2M)
  ├── >< directus_files (M2M — gallery)
  └── >< products (self-M2M — related products)
```

---

## Translation Pattern

Every translatable collection follows the same pattern:

```
parent_collection (id uuid, slug/code, non-translatable fields...)
  └── parent_collection_translations
        ├── id  (auto-increment integer)
        ├── parent_collection_id  → parent_collection.id  ON DELETE CASCADE
        ├── languages_code        → languages.code         ON DELETE CASCADE
        └── (translated fields: name, description, label, value, etc.)
```

Fields that are **never** translated: `slug`, `code`, `key`, `sku`, `status`, numeric values, dates, file references.
