# Product Catalog CMS Integration Plan

## Cross-Plan Dependency

This plan depends on `PRODUCT_CATALOG_EXTENSION_PLAN.md`. **Catalog Modules 0–9 must land before A4 (`product_page_templates`)** — otherwise editors get layout toggles for fields (`show_brand`, `show_certifications`, `show_specs`, `show_pricing_table`) that don't have backing data yet.

## Already-Done Status (verified against DB)

- **A3 — Extend `block_products`:** ✅ Already implemented. All proposed fields exist (`sort_by`, `show_price`, `show_sku`, `show_category_label`, `card_style`, `cta_url`, plus `cta_label`/`tagline`/`headline` in translations). Skip this work item. Actual `sort_by` choices are `sort` · `date_created_desc` · `price_asc` · `price_desc` · `name_asc` — use these exact values in frontend code.
- **A2 — `block_product_categories`:** ⚠️ Half-done. The M2A on `pages.blocks` already lists `block_product_categories` as an allowed collection, but the collection itself does not exist yet. Work needed: create the collection + translations only; skip the M2A registration step.

## Context — What Is Missing

The current product catalog has a working list and detail flow but the CMS is only a data store, not a layout/presentation controller. Specific gaps:

| Gap | Detail |
|---|---|
| **Category pages don't exist** | No route for `/en-US/products/electronics` or sub-categories |
| **Flat product URLs only** | All products live at `/{prefix}/{slug}` — no `/{prefix}/{cat}/{sub-cat}/{product}` |
| **No CMS control over ProductDetail layout** | Section order, spec layout style, visibility of sections are hardcoded in `.astro` |
| **`block_products` is minimal** | No sort control, no per-field show/hide, no card style variants |
| **No category block in page builder** | Can't render a subcategory grid on a page without writing code |
| **`product_categories` is data-only** | No description, no SEO, no cover image, no custom content blocks for category landing pages |
| **No product page builder** | Can't embed custom content sections (rich text, hero) within a product detail page |

---

## Design Principles

- **Everything editor-controlled** — layout decisions live in Directus, not in Astro templates
- **Incremental** — each part is independently deployable; the site still builds at every step
- **One routing algorithm** — a single `buildCategoryPaths()` utility resolves all multi-layer URLs at build time
- **Reusable templates** — `product_page_templates` lets editors set layout once and apply to many products
- **Same block pattern** — new blocks (`block_product_categories`) follow exactly the same structure as existing ones

---

## Part A — CMS Schema Extensions

### A1 — Extend `product_categories`

Add to the existing collection (no new collections; all fields go in existing groups).

**Fields to add:**

| Field | Interface | Group | Note / Placeholder |
|---|---|---|---|
| `cover_image` | file-image | Content | "Full-width banner image shown at the top of the category page. Different from the thumbnail `image` used in navigation cards." |
| `seo` | seo-interface | SEO tab (new `meta_seo` group-raw) | Same pattern as `products.seo` and `pages.seo`. |
| `blocks` | list-m2a | Content (below children O2M) | "Optional page builder blocks. Use to add a hero, rich text, or product highlights above or below the product listing." |

**Add to `product_categories_translations`:**

| Field | Type | Note / Placeholder |
|---|---|---|
| `description` | text | `e.g. Shop our full range of electronic devices...` — Short category description shown below the heading on the category page and in search results meta. |

**Add to `product_categories` (for layout control of its product listing):**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `spec_layout` | select-dropdown | `table` (default) · `accordion` · `comparison` — How product specs are displayed for products in this category. Can be overridden per product via its page template. |
| `listing_layout` | radio-cards-interface | `grid_3` (default) · `grid_2` · `grid_4` · `list` — Default layout for the product listing on this category's page. Matches `block_products.layout` choices. |
| `show_subcategories_bar` | boolean | Show subcategory filter tabs above the product grid on the category page. Default: true. |

**Add M2A `blocks` junction:**

New `product_category_blocks` junction collection (hidden, `group: product_categories`):

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `product_categories_id` | uuid | |
| `collection` | string | |
| `item` | string (M2A) | |
| `sort` | integer | |
| `background` | string (`light`/`dark`) | |
| `hide_block` | boolean | |
| `position` | string (`above`/`below`) | Render this block above or below the implicit product grid. Default `above`. Lets editors decide per-block instead of globally per category. |

Relations — same M2A pattern as `page_blocks`.

**Also add a new field on `product_categories`:**

| Field | Interface | Note |
|---|---|---|
| `default_page_template` | select-dropdown-m2o → `product_page_templates` (nullable) | Default product page layout for products in this category. Products can override via their own `page_template`. Falls back to site-default template if empty. |

This replaces the partial-override pattern (where category had only `spec_layout`) with a full cascade: `product.page_template` → `product.category.default_page_template` → site default. `spec_layout` and `listing_layout` on the category itself still control the **category landing page**, not product detail pages.

---

### A2 — New `block_product_categories` Block (M2A already registered)

Shows a grid of categories — for use in the page builder and as the category landing page header.

**Status:** The M2A registration on `pages.blocks` already includes `block_product_categories`. Only the collection itself needs to be created.

**Collection:** `block_product_categories`
**Meta:** `icon: grid_view`, group: `blocks`, `display_template: {{translations}}`

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `meta_header` | super-header | "Category Grid Block" |
| `parent_category` | select-dropdown-m2o → `product_categories` (nullable) | Leave empty to show all root-level categories. Set to a category to show its direct children only. |
| `depth` | input (integer) | `1` — How many levels deep to render. `1` = direct children only. Bounded in the frontend to a max of `3`. |
| `layout` | radio-cards-interface | `grid_2` · `grid_3` (default) · `grid_4` · `list` |
| `show_product_count` | boolean | Show the number of products in each category card. Default: false. |
| `translations` | translations | `languageField: "headline"`, tagline + headline fields. |

**`block_product_categories_translations`** (hidden):

Fields: `id`, `block_product_categories_id`, `languages_code`, `tagline`, `headline`.

---

### A3 — Extend `block_products` ✅ ALREADY DONE

All proposed fields exist in the live schema. **No work needed.**

Confirmed-existing fields on `block_products`: `sort_by`, `show_price`, `show_sku`, `show_category_label`, `card_style`, `cta_url`.
Confirmed-existing fields on `block_products_translations`: `tagline`, `headline`, `cta_label`.

**Reference for frontend code — actual `sort_by` choices:**
`sort` · `date_created_desc` · `price_asc` · `price_desc` · `name_asc`

---

### A4 — New `product_page_templates` Collection

Reusable display config for product detail pages. Products reference a template via M2O.

**Meta:** `icon: dashboard_customize`, group: `product_catalog`, `display_template: {{name}}`

**Fields:**

| Field | Interface | Note |
|---|---|---|
| `id` | hidden UUID | |
| `status` | select-dropdown | draft / published |
| `name` | input | Internal name — e.g. "Industrial Datasheet", "Consumer Simple", "Configurable Product". |
| `gallery_layout` | radio-cards-interface | `thumbnails` (default) · `carousel` · `grid` — How the image gallery is displayed. |
| `spec_layout` | select-dropdown | `table` (default) · `accordion` · `comparison` — How spec rows are grouped and rendered. |
| `show_breadcrumb` | boolean | Show the category breadcrumb above the product. Default: true. |
| `sections` | json (inline-repeater) | **Single source of truth for both visibility and order.** Drag to reorder; toggle `enabled` per row. See structure below. |

**`sections` repeater row structure:**

```json
{
  "section": "gallery" | "price" | "variants" | "specs" | "certifications" | "pricing_table" | "related" | "description" | "content_blocks" | "brand" | "sku",
  "enabled": true
}
```

The `section` field is a `select-dropdown` (not freetext) — Directus enforces the allowed values. A typo is impossible. Adding a new section type is a single dropdown-choice change plus a frontend case.

**Why a single repeater instead of `section_order` + `show_*` booleans:** Previously this had `section_order: ["specs", ...]` AND `show_specs: boolean` — two sources of truth that can disagree. With one repeater, "is the section shown" and "in what position" are the same row, edited in one place.

**Seed:** Create three starter templates: `Default`, `Minimal`, `Datasheet`.

Recommended starter `sections` for `Default`:
```json
[
  { "section": "gallery", "enabled": true },
  { "section": "price", "enabled": true },
  { "section": "brand", "enabled": true },
  { "section": "sku", "enabled": true },
  { "section": "variants", "enabled": true },
  { "section": "description", "enabled": true },
  { "section": "specs", "enabled": true },
  { "section": "certifications", "enabled": true },
  { "section": "pricing_table", "enabled": false },
  { "section": "related", "enabled": true },
  { "section": "content_blocks", "enabled": true }
]
```

---

### A5 — Extend `products`

Add two fields:

| Field | Interface | Note |
|---|---|---|
| `page_template` | select-dropdown-m2o → `product_page_templates` (nullable) | Optional display template controlling layout and section visibility. Falls back to the category's template, then site default. |
| `blocks` | list-m2a | Page builder blocks embedded in the product detail page. Rendered after the main product info section. Use for custom rich text, highlight callouts, or embedded media. |

**`product_blocks` junction** (hidden, `group: products`): same structure as `page_blocks` — `id`, `products_id`, `collection`, `item`, `sort`, `background`, `hide_block`.

---

### A6 — Multi-Category Membership ✅ DONE (schema + frontend wiring)

**Implementation status (as of this session):**

- ✅ `products_categories` junction collection created (group: `product_categories`, hidden, accountability: all)
- ✅ Fields on junction: `id` (int PK, auto), `products_id` (uuid), `product_categories_id` (uuid), `sort` (int)
- ✅ `products.additional_categories` alias (list-m2m, display template `{{product_categories_id.translations}}`, group `meta_content`, sort 31)
- ✅ Relation 1: `products_categories.products_id → products` (CASCADE, `one_field: "additional_categories"`, `junction_field: "product_categories_id"`, `sort_field: "sort"`, `one_deselect_action: "delete"`)
- ✅ Relation 2: `products_categories.product_categories_id → product_categories` (CASCADE, `junction_field: "products_id"`, `one_deselect_action: "nullify"`)
- ✅ Public read permission on `products_categories` (granted via Directus public policy)
- ✅ Frontend `Product` type extended with `additional_categories: { product_categories_id: ProductCategoryRef }[]`
- ✅ `fetchProductsByCategory` uses `_or` filter matching either primary `category` or `additional_categories.product_categories_id`
- ✅ `fetchProductBySlug` field list includes `additional_categories.product_categories_id.*` (id, slug, parent, translations)

**Still TODO (editor UX + storefront polish):**
- ⏳ Frontend filter on the `additional_categories` picker to exclude the currently-selected primary `products.category` (editor UX guard)
- ⏳ Optional: surface secondary category chips on the product detail page (storefront UX) — not blocking
- ⏳ Verify build/runtime: `npm run build` rerun after permission grant

Allow a product to appear under multiple categories without breaking canonical URLs or breadcrumbs.

**Design:** keep `products.category` (M2O) as the **primary / canonical** category — it drives the URL, breadcrumb, and main category chip. Add `products.additional_categories` (M2M) for **secondary listing memberships** — products appear on those category pages but do not get extra URLs.

**New junction: `products_categories`** (hidden, `group: product_categories`)

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `products_id` | uuid | |
| `product_categories_id` | uuid | |
| `sort` | int | Display order within the additional category's listing (optional). |

**New alias on `products`:**

| Field | Interface | Note |
|---|---|---|
| `additional_categories` | list-m2m → `product_categories` | "Extra category memberships for cross-listing. The product URL and breadcrumb are still controlled by the primary **Category** field above. Use this to make a product appear under multiple category pages." |

**Relations:**
- `products_categories.products_id → products` (`one_field: "additional_categories"`, `junction_field: "product_categories_id"`, CASCADE, `one_deselect_action: "delete"`)
- `products_categories.product_categories_id → product_categories` (CASCADE, `one_deselect_action: "nullify"`)

**URL / breadcrumb behaviour (unchanged):**
- Canonical URL is still `/{prefix}/{primary-category-path}/{product-slug}` (or flat if no primary category)
- Breadcrumb walks `products.category` only
- `additional_categories` never generates extra routes — listing-only

**`fetchProductsByCategory(categoryId, recursive = true)` update:**

```ts
filter: {
  _or: [
    { category: { _in: expandedCategoryIds } },                                          // primary match
    { additional_categories: { product_categories_id: { _in: expandedCategoryIds } } }   // secondary match
  ]
}
```

Where `expandedCategoryIds` includes the target category id plus all descendant ids when `recursive = true`.

**Editor UX guards:**
- In the `additional_categories` picker, exclude the currently-selected `products.category` (frontend filter, not DB constraint) — prevents the same category appearing as both primary and additional.
- Add a note above the field: "Already covered by the primary Category field — you only need this for extra listings."

**Effort:** ~30 min schema + one fetch function update.

---

## Part B — Routing Strategy

### B0 — Slug Collision Policy

`getStaticPaths` will generate one route per category and one route per product. If a category slug collides with a product slug at the same path depth, Astro's build fails loudly — which is the desired behaviour during dev.

**Rules to enforce (frontend validation, not DB constraint):**

1. **Category slugs are unique within their parent.** Directus does not enforce this automatically — add a build-time check in `buildCategoryPaths` that throws if duplicates are found.
2. **Product slugs are globally unique.** Already true via `products.slug` (extension-wpslug auto-generates unique slugs).
3. **No category slug may equal `productsPrefix`** (the permalink prefix of the products listing page, e.g. `products`). Add this to the same build-time check.
4. **No category slug may equal a product slug at the same depth.** Detect via set intersection in `buildCategoryPaths`; throw a clear error.

If any rule is violated, the build fails with a helpful message naming the offending slug. Editors fix the slug; rebuild succeeds. No 301 fallback machinery needed in dev.

### B1 — URL Structure

| URL pattern | Renders |
|---|---|
| `/{lang}/{prefix}` | Products listing page (existing, driven by `block_products` on a CMS page) |
| `/{lang}/{prefix}/{cat-slug}` | Category landing page |
| `/{lang}/{prefix}/{cat-slug}/{sub-cat-slug}` | Subcategory landing page |
| `/{lang}/{prefix}/{cat-slug}/{sub-cat-slug}/{product-slug}` | Product detail under category |
| `/{lang}/{prefix}/{product-slug}` | Product without a category (flat, existing behaviour) |

Disambiguation at build time: category paths and product paths are computed from the full category tree, so there is never ambiguity between a category URL and a product URL.

### B2 — Category Path Resolution Algorithm

New utility `buildCategoryPaths(categories)` in `src/lib/catalog.ts`:

```ts
// Input: flat list of all categories (id, slug, parent: id|null)
// Output: Map<categoryId, fullSlugPath>
// e.g. { "abc": "electronics", "def": "electronics/laptops" }
function buildCategoryPaths(categories: CategoryNode[]): Map<string, string>
```

- Walks parent references recursively (memoized to avoid repeat traversals)
- A root-level category (`parent = null`) → path = `category.slug`
- A nested category → path = `parent.fullPath/category.slug`

**Product full path:**
- Product with category → `{catPaths.get(product.category.id)}/{product.slug}`
- Product without category → `{product.slug}` (flat, unchanged)

**Category page slug in `getStaticPaths`:**
- `{productsPrefix}/{fullCategoryPath}` — e.g. `products/electronics/laptops`

### B3 — `getStaticPaths` Changes

Current `[...slug].astro` adds two entry types: `"page"` and `"post"` and `"product"`. Extend to add `"category"`.

New fetch calls needed (all run in `Promise.all`):
- `fetchAllCategories()` — returns `{ id, slug, parent: id|null }[]`
- Update `fetchAllProductSlugs()` → also return `{ slug, category: { id } | null }[]`

New static path entries:

```ts
// Category pages
...categoryPaths.map(([catId, catFullPath]) => ({
  params: { lang: lang.code, slug: `${productsPrefix}/${catFullPath}` },
  props: {
    type: "category" as const,
    language: lang,
    languages,
    categoryId: catId,
    categoryPath: catFullPath,
    productsPagePermalink: productsPagePermalink!,
  },
})),

// Product pages with category prefix
...productSlugs.map((p) => {
  const fullPath = p.category
    ? `${catPathMap.get(p.category.id)}/${p.slug}`
    : p.slug;
  return {
    params: { lang: lang.code, slug: `${productsPrefix}/${fullPath}` },
    props: {
      type: "product" as const,
      language: lang,
      languages,
      productSlug: p.slug,
      productsPagePermalink: productsPagePermalink!,
    },
  };
}),
```

### B4 — New / Updated API Functions

| Function | Change |
|---|---|
| `fetchAllCategories()` | New — returns `{ id, slug, parent: string\|null, translations: * }[]` for all published categories. **One flat fetch**; the parent/child tree is built in TS by `buildCategoryPaths`, not via Directus `deep` nesting. |
| `fetchCategoryById(id)` | New — full category with translations, cover_image, seo, children[], blocks M2A |
| `fetchAllProductSlugs()` | Update — also return `category: { id: string } \| null` per product |
| `fetchProducts()` | Update — accept `sort_by` param; include `category.translations.*` when `show_category_label` |
| `fetchProductsByCategory(categoryId, recursive = true)` | New — **defaults to recursive**: includes products from all descendant subcategories. Pass `recursive: false` to limit to direct children only. |
| `fetchProductsPagePermalink()` | Unchanged |
| `buildCategoryPaths()` | New utility (not an API call) — pure function in `src/lib/catalog.ts` |

---

## Part C — Frontend Components

### C1 — New: `CategoryLanding.astro`

Rendered when `props.type === "category"` in `[...slug].astro`.

Structure (implicit grid by default — editors don't need to add a `block_products` to every category):

1. **Breadcrumb** — `CategoryBreadcrumb.astro` — links to ancestor categories
2. **Category header** — cover image (if set), translated name, description
3. **Subcategory bar** — shown when `show_subcategories_bar` is true and category has children; renders chips or mini-cards linking to child category pages
4. **Blocks with `position = "above"`** — `BlockList` renders `category.blocks` rows where `position = "above"`
5. **Implicit product grid** — calls `fetchProductsByCategory(catId, recursive = true)`; layout driven by `category.listing_layout`
6. **Blocks with `position = "below"`** — remaining `category.blocks` rows
7. **Pagination** — static pagination using Astro's `paginate()` helper (SEO-friendly `/page/2/` URLs)

Props: `category`, `locale`, `productsPagePermalink`, `categoryPath`

### C2 — New: `CategoryBreadcrumb.astro`

Input: `categoryPath` string (e.g. `electronics/laptops`), `productsPagePermalink`, `locale`

Renders: Home → Products → Electronics → Laptops

Built by splitting the path on `/` and building href from cumulative segments. No extra API call needed.

### C3 — New: `BlockProductCategories.astro`

Page builder block. Registered in `PageBlocks.astro` for collection `block_product_categories`.

- Calls `fetchChildCategories(block.parent_category)` at build time
- Renders category cards: cover_image thumbnail, translated name, product count (if `show_product_count`)
- Links to category page URL via `buildCategoryPaths`
- Supports same `layout` options as `block_products`

### C4 — Updated: `ProductDetail.astro`

Resolve the active template via cascade: `product.page_template` → `product.category.default_page_template` → site default (hardcoded).

Then:

1. **Render sections in `template.sections` order** — iterate rows where `enabled = true`:
   - `gallery` → `ProductGallery.astro` (respects `gallery_layout`)
   - `price` → price + sale display (hide when `rfq_enabled`)
   - `brand` → `ProductBrandBadge.astro`
   - `sku` → small SKU label
   - `variants` → variant rows
   - `specs` → `ProductSpecs.astro` (respects `spec_layout`)
   - `certifications` → `ProductCertifications.astro`
   - `pricing_table` → `ProductPricingTable.astro`
   - `related` → mini product grid
   - `description` → prose HTML
   - `content_blocks` → `PageBlocks`-style render of `product.blocks` M2A

2. **Breadcrumb** — renders if `template.show_breadcrumb = true`

3. **Spec layout modes** (new `ProductSpecs.astro`)
   - `table` — two-column `<dl>` table (current default)
   - `accordion` — collapsible groups using `<details>/<summary>`
   - `comparison` — grid with spec groups as columns (useful for variant comparison)

### C5 — New: `ProductGallery.astro`

Extracted from `ProductDetail.astro`. Accepts `mainImage`, `gallery[]`, `layout`.

- `thumbnails` — current layout (main + thumbnail row below)
- `carousel` — main image with prev/next arrows; **CSS scroll-snap based, zero JS**. Use `scroll-snap-type: x mandatory` on a flex container and link buttons via `<a href="#img-N">` for keyboard control.
- `grid` — all images in a masonry-style grid

### C6 — Updated: `PageBlocks.astro`

Add dispatch for `block_product_categories`:

```ts
case "block_product_categories":
  return <BlockProductCategories block={...} background={...} locale={locale} productsPagePermalink={productsPagePermalink} />;
```

### C7 — Updated: `[...slug].astro`

```ts
type Props =
  | { type: "page"; ... }
  | { type: "post"; ... }
  | { type: "product"; ... }
  | { type: "category"; language; languages; categoryId: string; categoryPath: string; productsPagePermalink: string };
```

Add fetch and render for `type === "category"` → `<CategoryLanding>`.

---

## Part D — `api.ts` / `types.ts` Changes

### New types (add to `types.ts`)

```ts
type ProductPageSection =
  | "gallery" | "price" | "variants" | "specs" | "certifications"
  | "pricing_table" | "related" | "description" | "content_blocks"
  | "brand" | "sku";

type ProductPageTemplate = {
  id: string;
  name: string;
  gallery_layout: "thumbnails" | "carousel" | "grid";
  spec_layout: "table" | "accordion" | "comparison";
  show_breadcrumb: boolean;
  sections: { section: ProductPageSection; enabled: boolean }[];
};

type ProductCategoryNode = {
  id: string;
  slug: string;
  parent: string | null; // id
  status: string;
  image: string | null;
  cover_image: string | null;
  spec_layout: string | null;
  listing_layout: string | null;
  show_subcategories_bar: boolean;
  translations: { languages_code: string; name: string; description?: string }[];
  children: ProductCategoryNode[];
  seo: Record<string, unknown> | null;
  blocks: PageBlock[] | null;
};
```

Extend `Product`:
```ts
page_template: ProductPageTemplate | null;
blocks: PageBlock[] | null;
```

### `src/lib/catalog.ts` (new file)

```ts
export function buildCategoryPaths(
  categories: { id: string; slug: string; parent: string | null }[]
): Map<string, string>

export function getProductFullPath(
  productSlug: string,
  categoryId: string | null,
  catPaths: Map<string, string>
): string

export function resolveTemplate(
  product: Product,
  siteDefault: ProductPageTemplate
): ProductPageTemplate
// Cascade: product.page_template → product.category.default_page_template → siteDefault

export function getEnabledSections(
  template: ProductPageTemplate
): ProductPageSection[]
// Returns sections where enabled = true, in editor-defined order
```

---

## Implementation Order

**Prerequisite:** Catalog plan Modules 0–9 must land first, so `product_page_templates` can reference fields (`brand`, `certifications`, `specs`, `pricing_tiers`) that actually exist.

1. **A1** — Extend `product_categories`: `description` in translations, `cover_image`, `seo`, `spec_layout`, `listing_layout`, `show_subcategories_bar`, `default_page_template` (m2o, added after A4)
2. **A1 (junction)** — Add `product_category_blocks` M2A junction (with `position` field) + `blocks` alias on `product_categories`
3. **A4** — Create `product_page_templates` collection with single `sections` repeater
4. **A1 follow-up** — Add `product_categories.default_page_template` m2o (now that A4 exists)
5. **A5** — Add `page_template` and `blocks` / `product_blocks` junction on `products`
5b. **A6** — Add `additional_categories` M2M (`products_categories` junction) on `products`
6. **~~A3~~** — Already done, skip
7. **A2** — Create `block_product_categories` + translations (M2A registration already exists)
8. **B — Routing** — Update `getStaticPaths`, add `fetchAllCategories`, update `fetchAllProductSlugs`, add `catalog.ts` (incl. slug-collision check from B0)
9. **C1/C2** — Build `CategoryLanding.astro` + `CategoryBreadcrumb.astro` (implicit grid, blocks rendered above/below by `position`)
10. **C3** — Build `BlockProductCategories.astro` + update `PageBlocks.astro`
11. **C4/C5** — Refactor `ProductDetail.astro` (template cascade + sections repeater), extract `ProductGallery.astro` (scroll-snap carousel)
12. **Seed** — Create 3 starter `product_page_templates` (Default / Minimal / Datasheet), add `cover_image` / `description` to existing dummy categories

---

## Resolved Decisions (locked in by this plan)

1. **Pagination** → Astro `paginate()` (SEO-friendly `/page/2/` URLs).
2. **Product URL strategy** → Break old URLs cleanly. Dev phase, no 301 machinery. Update all URLs from the start.
3. **Category `blocks` position** → Editor-controllable per-block via `position` field on `product_category_blocks` junction. Default `above`.
4. **Category landing rendering** → Implicit product grid + `blocks` rendered around it. Editors do not need to add a `block_products` to every category.
5. **Template cascade** → `product.page_template` → `product.category.default_page_template` → site default. Full template inheritance, not partial-field overrides.

## Open Questions (still need answers)

1. **Site-default template** — should "site default" be a hardcoded const in `catalog.ts`, or a singleton field on `globals` (m2o → `product_page_templates`)? Hardcoded is simpler; globals-driven lets non-devs change the fallback.
2. **Category nav auto-population** — do categories appear in the main `navigation` collection automatically (e.g. via a Directus flow), or do editors add nav items manually? Recommend manual to start.
3. **`product_attributes` for faceted filtering** — defer to a later milestone (consistent with the catalog plan's open question), or block category landing pages until it exists?

---

## Status

**Audit performed against live schema + frontend — this entire plan is essentially shipped.**

- [x] Plan reviewed & approved
- [x] **Prereq:** Catalog plan Modules 0–9 complete
- [x] A1 — Extend `product_categories`: `cover_image`, `seo`, `spec_layout`, `listing_layout`, `show_subcategories_bar`, `eclass_code`, `eclass_version`, `brand`
- [x] A1 — `product_category_blocks` junction (M2A) + `blocks` alias on `product_categories`
- [x] A4 — `product_page_templates` collection
- [x] A1 follow-up — `product_categories.default_page_template` m2o
- [x] A5 — `products.page_template` + `products.blocks` / `product_blocks` junction
- [x] A6 — `products.additional_categories` M2M + `products_categories` junction (schema, relations, public read permission, frontend types + fetch wiring all done)
- [x] ~~A3 — Extend `block_products`~~ — already done in DB
- [x] A2 — `block_product_categories` + translations (collection exists; M2A registration already exists)
- [x] B — Routing: `catalog.ts` (incl. slug-collision check), updated `getStaticPaths`, new API functions (`fetchAllCategories`, `fetchProductsByCategory`, etc.)
- [x] C1/C2 — `CategoryLanding.astro` + `CategoryBreadcrumb.astro`
- [x] C3 — `BlockProductCategories.astro` + `PageBlocks.astro` update
- [x] C4/C5 — `ProductDetail.astro` refactor + `ProductGallery.astro`
- [ ] Seed starter `product_page_templates` (Default / Minimal / Datasheet)

**Remaining polish (non-blocking):**

- [ ] A6 editor-UX guard: filter `additional_categories` picker to exclude the currently-selected primary `products.category`
- [ ] Optional: surface secondary category chips on the product detail page (storefront UX)
- [ ] Resolve Open Questions: site-default template (hardcoded vs globals m2o), category auto-nav-population, `product_attributes` faceted filtering
