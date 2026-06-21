# Product Page — Data Mapping Guide

**Audience:** Developers onboarding to this project.  
**Purpose:** Map every visible UI element on a product detail page to its exact Directus source.  
**Last audited:** 2026-06-21

---

## How a product page is rendered

```
[lang]/[...slug].astro          ← getStaticPaths() builds product routes
  └── SlugContent.astro         ← fetches product via fetchProductBySlug()
        └── ProductDetail.astro ← main layout/rendering component
              ├── CategoryBreadcrumb.astro
              ├── EclassBadge.astro       ← meta bar below hero
              ├── ProductTags.astro       ← meta bar below hero
              ├── blocks/BlockProductSpecs.astro
              │     └── ProductSpecs.astro
              ├── ProductCertifications.astro
              ├── ProductPricingTable.astro
              └── PageBlocks.astro  ← renders product.blocks (M2A)
```

The fetch function is `fetchProductBySlug()` in `frontend/src/lib/api.ts`.  
All field strings come from `PRODUCT_DETAIL_FIELDS` (lines 452–590 of `api.ts`).

---

## Section-by-section UI mapping

### 1. Page `<title>` / SEO

| Element | Directus source | Component | Notes |
|---|---|---|---|
| `<title>` tag | `products.translations.name` (via `getTranslation`) | `SlugContent.astro` → `BaseLayout.astro` | Falls back to `product.slug` |
| `<meta name="description">` | `globals.description` (site-wide only) | `BaseLayout.astro` line 54 | **Gap:** No per-product SEO meta description wired. `products.seo` field exists in SQL but is not fetched and not rendered. |
| og:image | Not rendered | — | **Gap:** No og:image meta tag exists anywhere. |
| Canonical URL | Not rendered | — | **Gap:** No `<link rel="canonical">` is set. |

---

### 2. Breadcrumb bar

Shown when `heroBlock.show_breadcrumb === true` (or the default template is active which defaults to `true`) AND the product has a category.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| "Home" link | Hardcoded — `/{locale}` | `CategoryBreadcrumb.astro` line 49 | Label "Home" is hardcoded English |
| Products root link | Derived from the page that has a `block_products` block — via `fetchProductsPagePermalink()` | `CategoryBreadcrumb.astro` | Label is the URL segment, `.capitalize()` CSS. **Hardcoded** — should come from the products page title |
| Category segments | `product_categories.translations.name` via the locale | `CategoryBreadcrumb.astro` | Correctly localised |
| Product name (current) | Not shown in breadcrumb — stops at final category | `CategoryBreadcrumb.astro` | By design |
| CTA in breadcrumb bar | `href="/contact"` — **hardcoded URL and label** | `ProductDetail.astro` line 99–102 | Label "Information & Request Form" is hardcoded. URL is hardcoded. Both should come from a Directus source. |
| Breadcrumb bar visibility | `block_product_hero.show_breadcrumb` (template block) | `ProductDetail.astro` lines 27–30 | Cascade: product template → category template → `DEFAULT_PRODUCT_PAGE_TEMPLATE` (show_breadcrumb=true) |

---

### 3. Hero section (dark band)

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Background colour | Hardcoded `bg-zinc-950 text-white` | `ProductDetail.astro` line 108 | Not CMS-controlled |
| Category tagline (above product name) | `product_categories.translations.name` (current locale) | `ProductDetail.astro` lines 117–122 | First word rendered in accent colour, rest in muted white — style is hardcoded. Logic to split on the first word is hardcoded. |
| Product name (h1) | `products.translations.name` | `ProductDetail.astro` lines 125–129 | Correctly sourced |
| Tagline (subtitle) | `products.translations.tagline` | `ProductDetail.astro` lines 132–134 | Correctly sourced |
| Model range | `products.translations.model_range` | `ProductDetail.astro` lines 138–144 | Correctly sourced |
| Primary hero image | `products.image` (UUID → asset URL, 900×1000 cover) | `ProductDetail.astro` lines 55–57 | Correctly sourced |
| Brand logo overlay | `product_brands.logo` | `ProductDetail.astro` lines 61–63 | Correctly sourced. Rendered in bottom-left of image area. |
| "Information & Request Form" CTA | **Hardcoded** `href="/contact"`, label "Information & Request Form" | `ProductDetail.astro` line 149–153 | Should come from Directus (e.g. `block_product_cta_group` or a globals field) |
| "Key Features" anchor link | **Hardcoded** label "Key Features" and `href="#key-features"` | `ProductDetail.astro` lines 154–161 | Label is hardcoded English. The anchor id `key-features` is also hardcoded in the JSX. |
| Hero layout (two-column: text left, image right) | **Hardcoded** — always `md:grid-cols-[45%_55%]` | `ProductDetail.astro` line 111 | `block_product_hero.image_position` field exists in the schema (left \| right \| full_bleed \| none) but is not fetched or used. |
| show_tagline flag | **Not used** — `block_product_hero.show_tagline` exists in SQL schema but is not fetched or rendered conditionally | — | Gap |
| show_model_range flag | **Not used** — `block_product_hero.show_model_range` exists in SQL schema but is not fetched or rendered conditionally | — | Gap |
| show_stats flag | **Not used** — `block_product_hero.show_stats` exists in SQL schema (pulls `product_highlights` where kind='stat') | — | Gap — stat highlights are not rendered anywhere |
| enable_zoom / enable_floorplan_view / enable_3d_view | **Not used** — all three flags exist in SQL for `block_product_hero` but not fetched | — | Gap |

---

### 4. Key features / page-builder content blocks

The "Key Features" section and all other page-level content blocks are sourced from `products.blocks` (the `product_blocks` M2A junction, same pattern as `pages.blocks`).

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Feature grid | `product_blocks` (M2A) → `block_features_grid` | `PageBlocks.astro` via `ProductDetail.astro` lines 190–198 | Only rendered if `showContentBlocks` is true (requires `block_product_content_slot` in the template) |
| Rich text blocks | `product_blocks` → `block_richtext` | `PageBlocks.astro` | Same condition |
| CTA banners | `product_blocks` → `block_cta_banner` | `PageBlocks.astro` | Same condition |
| Any other general blocks | `product_blocks` → any `block_*` in the allowed collection list | `PageBlocks.astro` | Same condition — `block_product_specs` and `block_product_card_grid` are split out and rendered separately (see sections 5 and 8). |

`showContentBlocks` is `true` when the resolved template contains a `block_product_content_slot` block (it acts as a slot marker). The `featureBlocks` array is rendered before specs; `otherBlocks` (everything except `block_features_grid`, `block_product_specs`, `block_product_card_grid`) is rendered after specs and gallery.

---

### 5. Technical specifications section

Controlled by the presence of `block_product_specs` blocks in `products.blocks` **or** in the resolved page template's tabs.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Section visibility | `block_product_specs` blocks from either `products.blocks` (per-product) or the resolved template's tabs | `ProductDetail.astro` — `specBlocksById` map | Fixed: previously only per-product blocks were scanned, so template-defined spec blocks never rendered. Both sources are now merged (deduped by id) before rendering. |
| "TECHNICAL SPECIFICATIONS" label | **Hardcoded** — "TECHNICAL" in accent, "SPECIFICATIONS" in slate | `ProductDetail.astro` lines 207–209 | "TECHNICAL" and "SPECIFICATIONS" are hardcoded English words. The colour split is hardcoded. |
| Product description text shown under section header | `products.translations.description` | `ProductDetail.astro` line 210 | Correctly sourced |
| Spec layout mode | `block_product_specs.layout` | `BlockProductSpecs.astro` → `ProductSpecs.astro` | Supports: table, accordion, comparison_table, comparison_accordion, numbered_list, feature_grid |
| Spec group filter | `block_product_specs.spec_group` (UUID of a `product_spec_groups` row) | `BlockProductSpecs.astro` lines 16–18 | Null = show all groups |
| Spec group name | `product_spec_groups.translations.name` | `ProductSpecs.astro` line 31 | Falls back to group id if no translation found |
| Spec group icon | `product_spec_groups.icon` (Material Symbols icon name) | `ProductSpecs.astro` lines 88–91 | Correctly sourced |
| Spec group IRDI (tooltip) | `product_spec_groups.irdi` | `ProductSpecs.astro` line 86 | Shown as `title` attribute on `<h3>` |
| Spec row label | `product_specs.translations.label` | `ProductSpecs.astro` | Correctly sourced |
| Spec row value | `product_specs.translations.value` | `ProductSpecs.astro` `renderValue()` | Appends `product_specs.unit.symbol` |
| Spec note | `product_specs.translations.note` | `ProductSpecs.astro` | Rendered as a small caption under the value (or under the label in comparison layouts), in all 6 layouts |
| Spec IRDI (tooltip) | `product_specs.irdi` | `ProductSpecs.astro` | Shown as `title` attribute on `<dt>` |
| Spec unit | `product_units.symbol` | `ProductSpecs.astro` | Falls back to unit.code. Unit abbreviation from translations is not used here. |
| Per-variant spec values | `product_spec_variant_values.value` (nested under each spec) | `ProductSpecs.astro` `getComparisonValue()` | Only relevant for comparison_table / comparison_accordion layouts |
| Engineering drawings (media) | `product_media` where `purpose = 'spec_drawing'` | `BlockProductSpecs.astro` lines 23–33 | Controlled by `block_product_specs.show_media` and `media_position` |
| Media caption | `product_media_translations.caption` | `BlockProductSpecs.astro` | Rendered as a `<figcaption>` below each spec drawing |

**Ungrouped specs fallback label:** When a spec has no group, the group label is hardcoded as `"Specifications"` (`ProductSpecs.astro` line 33). This is English-only.

---

### 6. Photo gallery strip

Shown when `showGallery` is true (template has `block_product_gallery`) AND `product.gallery` is non-empty.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Gallery images | `products_files.directus_files_id` (M2M) → asset URL 700×500 cover | `ProductDetail.astro` lines 233–244 | All gallery items rendered with `alt=""`. No caption or title. |
| Gallery layout | **Hardcoded** — always horizontal scrolling strip, fixed height | `ProductDetail.astro` | `block_product_gallery.layout` (thumbnails \| carousel \| grid) exists in the schema but is not fetched. |
| Gallery image alt text | `""` empty — **hardcoded** | `ProductDetail.astro` | Should use `products.translations.name` or per-image caption from `product_media` |

---

### 7. Certifications

Shown when any template block or `cardGridBlocks` has `source = "certifications"` AND `product.certifications` is non-empty.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Section header | **Hardcoded** "Certifications" | `ProductDetail.astro` line 258 | English only |
| Certification name | `product_certifications.translations.name` | `ProductCertifications.astro` line 41 | Falls back to `cert.issuer` then hardcoded "Certification" |
| Certification description | `product_certifications.translations.description` | `ProductCertifications.astro` line 44 | Correctly sourced |
| Issuer | `product_certifications.issuer` | `ProductCertifications.astro` line 51 | Label "Issuer:" is **hardcoded** |
| Certificate number | `product_certifications.certificate_number` | `ProductCertifications.astro` line 52 | Label "Cert #:" is **hardcoded** |
| Obtained date | `products_certifications.obtained_at` (junction field) | `ProductCertifications.astro` line 53 | Label "Obtained:" is **hardcoded** |
| Expiry date | `product_certifications.expires_at` | `ProductCertifications.astro` line 54 | Label "Expires:" is **hardcoded** |
| "Expired" badge | `product_certifications.expires_at` compared to `new Date()` | `ProductCertifications.astro` line 27 | Label "Expired" is **hardcoded** |
| Document link | `product_certifications.document` → asset URL | `ProductCertifications.astro` lines 23–25 | Label "View ↗" is **hardcoded** |
| "✓" / "⏰" icons | Hardcoded string characters | `ProductCertifications.astro` line 36 | Not CMS-controlled |
| `issued_at` field | `product_certifications.issued_at` exists in SQL | — | **Fetched** in `PRODUCT_DETAIL_FIELDS` but **not rendered** |

---

### 8. Volume pricing table

Shown when `showPricingTable` is true (template has `block_product_pricing_table`) AND `product.pricing_tiers` is non-empty.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Section header | **Hardcoded** "Volume Pricing" | `ProductDetail.astro` line 265 | English only |
| Column header — quantity | **Hardcoded** "Qty" | `ProductPricingTable.astro` line 29 | English only |
| Column header — price | `customer_groups.translations.name` (current locale) | `ProductPricingTable.astro` line 36 | Falls back to hardcoded "Price" when group is null |
| Quantity range | `product_pricing_tiers.min_quantity` / `max_quantity` | `ProductPricingTable.astro` lines 51–52 | Uses `+` suffix for open-ended ranges — **hardcoded** |
| Price value | `product_pricing_tiers.price` | `ProductPricingTable.astro` line 63 | Uses `formatPrice(price, locale, currency)` |
| Tier note | `product_pricing_tiers.note` | `ProductPricingTable.astro` lines 77–85 | Rendered as footnotes. Prefix `* ` is **hardcoded** |
| Currency | **Hardcoded** `"USD"` | `ProductDetail.astro` line 42 | Should come from `globals.default_currency` or a regional price region. `Globals.default_currency` is defined in `types.ts` but is **not fetched** in `fetchGlobals()`. |
| `display_style` (table vs cards) | `block_product_pricing_table.display_style` | — | Only "table" style is implemented. Cards layout not rendered. |

---

### 9. Related products

Shown when `showRelated` is true (template has `block_product_related`) AND `product.related_products` is non-empty.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Section header | **Hardcoded** "Related Products" | `ProductDetail.astro` line 273 | English only |
| Product image | `products.image` → 400×400 cover | `ProductDetail.astro` line 279 | Correctly sourced |
| Product name | `products.translations.name` (via `getTranslation`) | `ProductDetail.astro` line 299 | Falls back to `rel.slug` |
| Product price | `products.price` | `ProductDetail.astro` line 283 | `formatPrice(price, locale, currency)` with hardcoded "USD" |
| Compare-at price | `products.compare_at_price` | `ProductDetail.astro` lines 305–308 | Only shown if `isOnSale()` returns true |
| Product URL | Built from `products.slug` + `rel.category.id` + `catPathMap` using `getProductFullPath()` | `ProductDetail.astro` | Fixed: `related_products_id.category.id` is now fetched and passed as `categoryId`, so related product URLs respect `urlStructure` instead of always being flat. `allCategories` is now also fetched whenever any related product has a category, not just when the breadcrumb needs it. |
| Fallback placeholder | Hardcoded `⚙` gear emoji | `ProductDetail.astro` line 291 | |
| Grid layout | **Hardcoded** `sm:grid-cols-2 lg:grid-cols-4` | `ProductDetail.astro` line 275 | `block_product_related.layout` (grid_2 \| grid_3 \| grid_4 \| list) and `.limit` exist in schema but are not fetched. |

---

### 10. Tags

`ProductTags.astro` is now mounted in a "meta bar" below the hero, alongside the eCl@ss badge.

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Tag pills | `product_tags.translations.name` | `ProductTags.astro`, mounted from `ProductDetail.astro` | Rendered in the meta bar (white strip below the hero) together with `EclassBadge` |

---

### 11. Schema fields with no UI (completely unwired)

The following Directus collections/fields exist in the SQL schema, have types in `types.ts`, and in some cases are even fetched, but have **zero rendering** in the current frontend:

| Schema entity | Fetched? | Rendered? | Notes |
|---|---|---|---|
| `products.seo` (JSON field) | No — not in `PRODUCT_DETAIL_FIELDS` | No | Per-product SEO meta tags. `Page.seo` has a similar gap — the JSON is fetched for pages but only `seo.title` is used for `<title>`. |
| `products_translations.display_title` | No — not in `translations.*`? | No | `display_title` is in the SQL schema (marketing-facing name) but not declared in `ProductTranslation` type nor requested. `translations.*` wildcard should include it IF the column exists in Directus; needs verification. |
| `product_highlights` (entire collection) | No | No | `product_highlights` is not fetched at all in `PRODUCT_DETAIL_FIELDS`. The `block_product_card_grid` with `source="highlights"` or `source="capabilities"` would need this data, but it's not fetched. |
| `product_options` (entire collection) | No | No | Not fetched. `block_product_card_grid` with `source="options"` and `block_product_options` both require this. |
| `product_documents` (entire collection) | No | No | Not fetched. `block_product_documents` requires this. |
| `product_faqs` (entire collection) | No | No | Not fetched. `block_product_faq` requires this. |
| `block_product_buybox` | Not fetched | Not rendered | Buy box block exists in schema. No component. |
| `block_product_description` | Not fetched | Not rendered | Description block. No component. The description content (`products.translations.description` and `.content`) is shown in some places but there's no dedicated block component. |
| `block_product_cta_group` | Not fetched | Not rendered | CTA buttons block. No component. The two hardcoded CTAs in the hero would be replaced by this. |
| `block_product_options` | Not fetched | Not rendered | Options/parts section block. No component. |
| `block_product_documents` | Not fetched | Not rendered | Downloads section block. No component. |
| `block_product_faq` | Not fetched | Not rendered | FAQ block. No component. |
| `block_product_pricing_table.display_style` | Not fetched | N/A | `display_style` (table \| cards) not fetched; only "table" implemented. |
| `block_product_related.layout` and `.limit` | Not fetched | N/A | Layout and item limit for related products grid are not fetched. |
| `block_product_gallery.layout` | Not fetched | N/A | gallery layout mode (thumbnails \| carousel \| grid) not fetched. |
| `block_product_hero.image_position` | Not fetched | N/A | Hero image position (left \| right \| full_bleed \| none) not fetched. |
| `block_product_hero.show_tagline` | Not fetched | N/A | Flag to conditionally show tagline. |
| `block_product_hero.show_model_range` | Not fetched | N/A | Flag to conditionally show model range. |
| `block_product_hero.show_stats` | Not fetched | N/A | Flag to show `product_highlights` where kind='stat'. |
| `block_product_hero.cta_style` | Not fetched | N/A | Controls CTA pattern (quote_only / cart_and_wishlist / both). |
| `block_product_hero.enable_zoom` | Not fetched | N/A | |
| `block_product_hero.enable_floorplan_view` | Not fetched | N/A | |
| `block_product_hero.enable_3d_view` | Not fetched | N/A | |
| `block_product_card_grid.display_style` | Partially fetched (only `source`) | N/A | `display_style`, `columns`, `limit` are not fetched. Only `source` is fetched (in `PRODUCT_TEMPLATE_BLOCK_ITEM_FIELDS`). |
| `ProductTags` component | Fetched via `tags.*` | **Rendered** | Mounted in the meta bar below the hero (fixed). |
| `products_translations.content` | Fetched via `translations.*` | **Rendered** | New "Description" section between the meta bar and Key Features, using `prose` classes. No dedicated `block_product_description` component yet — this is a flat section, not block-driven. |
| `product_certifications.issued_at` | Fetched | **Rendered** | Shown as "Issued: …" next to "Obtained: …" in `ProductCertifications.astro` (fixed). |
| `product_media_translations.caption` | Fetched | **Rendered** | Shown as `<figcaption>` below each spec drawing (fixed). |
| `product_specs.translations.note` | Fetched | **Rendered** | Shown as a small caption under the value/label across all spec layouts (fixed). |
| `product_variants` (in general) | Fetched | Not rendered as a variant selector | Variant data is fetched but there is no variant selector UI. Variants are only used in comparison table/accordion spec layouts to show column headers. No price/SKU/stock rendering per variant. |
| `product_variants.stock` | Fetched | Not rendered | Stock level not shown. |
| `product_variants.low_stock_threshold` | Fetched | Not rendered | Low-stock warning not implemented. |
| `product_variants.reorder_point` | In type but not fetched | Not rendered | Not in `PRODUCT_DETAIL_FIELDS`. |
| `product_variants.reorder_quantity` | In type but not fetched | Not rendered | Not in `PRODUCT_DETAIL_FIELDS`. |
| `product_regional_prices` | Fetched | Not rendered | Regional price data is fetched but not used. |
| `rfq_enabled` / `rfq_min_quantity` / `rfq_lead_time_days` | Fetched | Not rendered | RFQ configuration fields exist and are fetched. No RFQ form or UI is rendered. **Still open** — out of scope for the "quick wins" pass done 2026-06-21. |
| `product_type` | Fetched | Not rendered | standard \| consumable \| service \| configurable — not used anywhere in `ProductDetail.astro`. **Still open.** |
| `unit` / `unit_quantity` | Fetched | **Rendered** | Shown as "Priced per {unit}" above the Volume Pricing table (fixed). |
| `eclass_code` / `eclass_version` | Fetched | **Rendered** | `EclassBadge` is now mounted in the meta bar below the hero, driven by `resolveEclassCode()` (fixed). |
| `brand.translations.description` | Fetched via `brand.translations.*` | Not rendered | Brand description is in the type and fetched but not shown. |
| `product_page_tabs` tab navigation | Fetched | Not rendered | Multi-tab template support exists in data structures but no tab navigation UI is rendered. All template blocks are currently flattened into a single-page layout by `getTemplateBlocks()`. |

---

### 12. Brand section

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Brand logo (hero overlay) | `product_brands.logo` → 160×80 contain | `ProductDetail.astro` lines 61–63 | Shown bottom-left of hero image |
| Brand name | `product_brands.translations.name` | Not rendered on product page | **Not rendered** — only the logo is shown |
| Brand website link | `product_brands.website` | Not rendered | Not rendered |

---

### 13. Category and URL structure

| Element | Directus source | Component | Notes |
|---|---|---|---|
| Product URL | `products.slug` + `product_categories` tree built via `buildCategoryPaths()` | `[...slug].astro` `getStaticPaths()` | URL structure (category_prefixed / flat / etc.) controlled by `globals.product_url_structure` |
| Breadcrumb path | `product_categories` hierarchy + `translations.name` / `translations.slug` | `CategoryBreadcrumb.astro` | |
| Primary category | `products.category` (FK to `product_categories`) | Used for URL resolution and breadcrumb | |
| Additional categories | `products_categories` (M2M junction) | Used only for `fetchProductsByCategory` filtering | Not displayed on product page itself |

---

### 14. Page template / tab system

| Element | Directus source | Notes |
|---|---|---|
| Which sections appear | `product_page_templates` via `resolveTemplate()` cascade: `products.page_template` → `product_categories.default_page_template` → `DEFAULT_PRODUCT_PAGE_TEMPLATE` (code fallback) | `catalog.ts` `resolveTemplate()` |
| Section ordering | `product_page_tabs.blocks` sorted by `product_template_blocks.sort` | Flattened by `getTemplateBlocks()` — no tab UI rendered |
| Tab labels/keys | `product_page_tabs.translations.label` / `.key` | Fetched but not rendered. No tab navigation component exists. |
| Template-level block_product_specs | `product_page_tabs.blocks` → `block_product_specs` | **Not used in rendering.** Only per-product `product.blocks` is checked for `block_product_specs` in `ProductDetail.astro`. Template-level spec blocks are ignored. This is a significant gap — the template system is only partially honoured. |

---

## Hardcoded strings inventory

The following user-visible strings are hardcoded in English and should be moved to Directus (or at minimum to a localisation map in the frontend):

| String | Location | Suggested source |
|---|---|---|
| "Information & Request Form" (breadcrumb bar CTA) | `ProductDetail.astro` line 100 | `block_product_cta_group` buttons, or a globals field |
| "Information & Request Form" (hero CTA button) | `ProductDetail.astro` line 151 | Same |
| "Key Features" (hero anchor link label) | `ProductDetail.astro` line 155 | `block_product_content_slot` or a block translation |
| `href="/contact"` (both CTAs) | `ProductDetail.astro` lines 99, 149 | `block_product_cta_group` button URL |
| `#key-features` (anchor) | `ProductDetail.astro` line 157 | Should follow the `block_product_content_slot` sort position |
| "TECHNICAL SPECIFICATIONS" section label | `ProductDetail.astro` line 208 | Should come from `block_product_specs` translations or a block-level label |
| "Certifications" section header | `ProductDetail.astro` line 258 | Block header translation |
| "Volume Pricing" section header | `ProductDetail.astro` line 265 | Block header translation |
| "Related Products" section header | `ProductDetail.astro` line 273 | Block header translation |
| "Issuer:" label | `ProductCertifications.astro` line 51 | i18n map |
| "Cert #:" label | `ProductCertifications.astro` line 52 | i18n map |
| "Obtained:" label | `ProductCertifications.astro` line 53 | i18n map |
| "Expires:" label | `ProductCertifications.astro` line 54 | i18n map |
| "Expired" badge text | `ProductCertifications.astro` | i18n map |
| "View ↗" (cert document link) | `ProductCertifications.astro` line 63 | i18n map |
| "Certification" (fallback name) | `ProductCertifications.astro` line 41 | i18n map |
| "Qty" table header | `ProductPricingTable.astro` line 29 | i18n map |
| "Price" fallback column header | `ProductPricingTable.astro` line 36 | i18n map |
| "Specifications" (ungrouped fallback) | `ProductSpecs.astro` line 33 | i18n map or spec group name |
| "✓ Yes" / "✗ No" booleans | `ProductSpecs.astro` `renderValue()` line 48–49 | i18n map |
| `"USD"` currency | `ProductDetail.astro` line 42 | `globals.default_currency` (field is in `Globals` type but not fetched) |
| "Home" breadcrumb label | `CategoryBreadcrumb.astro` line 49 | i18n map or globals |
| `⚙` placeholder emoji | `ProductDetail.astro` line 291 | Design decision / could be an icon |
| `"Page not found."` | `SlugContent.astro` line 132 | i18n |

---

## Fetched but not rendered (data gaps)

Quick-reference list for fields that are being fetched from Directus (cost network/DB) but wasted because the component never uses them:

As of 2026-06-21, the unit/eCl@ss/tags/spec-note/caption/issued_at rows below were resolved in a "quick wins" pass — see the per-section notes above. Remaining open gaps:

| Field / data | Where fetched | Why not rendered |
|---|---|---|
| `products.seo` | Not fetched | Never requested in `PRODUCT_DETAIL_FIELDS` — need to add |
| `products_translations.display_title` | Via `translations.*` if column exists | Not declared in `ProductTranslation` type; not rendered |
| `products.rfq_enabled` / `rfq_min_quantity` / `rfq_lead_time_days` | Fetched | No RFQ UI component |
| `products.product_type` | Fetched | Not used in rendering |
| `product_variants.stock` / `low_stock_threshold` | Fetched | No stock UI |
| `product_variants.options` | Fetched | No variant selector UI |
| `product_regional_prices.*` | Fetched (full region data) | No regional pricing display |
| `product_brands.translations.*` (description, etc.) | Fetched | Only logo is rendered |
| `product_page_tabs` translations/key | Fetched via `PRODUCT_PAGE_TEMPLATE_FIELDS` | No tab nav UI; tabs are flattened |

---

## Summary of critical gaps to address

Prioritised by user impact:

**Resolved on 2026-06-21:**

- ~~Related products use wrong URL~~ — fixed. `related_products_id.category.id` is now fetched and passed to `getProductFullPath()`.
- ~~Tags not rendered~~ — fixed. `ProductTags` is now mounted in a meta bar below the hero.
- ~~Template spec blocks ignored~~ — fixed. `specBlocks` now merges `product.blocks` and template-tab blocks, deduped by id.
- ~~`unit`/`unit_quantity`, `eclass_code`/`eclass_version`, spec notes, media captions, certification `issued_at`, rich-text `content`~~ — all now rendered (see per-section notes above).

**Still open**, prioritised by user impact:

1. **No per-product SEO tags** — `products.seo` is not fetched and no `<meta>` tags are emitted per product. Affects search engine indexing.
2. **Hardcoded CTAs** — "/contact" links and button labels should be driven by `block_product_cta_group` or globals.
3. **Currency hardcoded as "USD"** — `globals.default_currency` is in `Globals` type but not fetched. Multi-currency not possible.
4. **`product_highlights` not fetched** — `block_product_card_grid` with `source="highlights"` or `source="capabilities"` will render an empty section because the underlying data is never fetched.
5. **No tab navigation** — multi-tab templates exist in data but there's no tab nav component. All content renders as a single page.
6. **`display_title` not in `ProductTranslation` type** — the SQL schema has `products_translations.display_title` but it's not in `types.ts` and not rendered.
7. **No RFQ UI** — `rfq_enabled`/`rfq_min_quantity`/`rfq_lead_time_days` are fetched but there's no quote-request form or "Request a Quote" state.
8. **`product_options` / `product_documents` / `product_faqs` not fetched** — corresponding blocks (`block_product_options`, `block_product_documents`, `block_product_faq`) have no data source or component.
