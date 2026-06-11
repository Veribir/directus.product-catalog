# Barkomas.com Design Implementation — Status

**Status: Implemented.** This document originally planned the visual/IA redesign of the
Homepage, Category Listing, and Product Detail pages to match barkomas.com. All phases
described below have been built. It's kept as a reference for the schema/component
decisions made along the way — see [product-catalog-schema.sql](../../directus/schema/product-catalog-schema.sql)
for the canonical, up-to-date product catalog + product page-builder schema.

**Scope:** Homepage, Category Listing, Product Detail, plus the shared Navbar and Footer.

---

## 1. Page Types

| URL Pattern | Page Type | Component |
|---|---|---|
| `/{lang}` | Homepage | `pages/[lang]/index.astro` (page builder via `PageBlocks.astro`) |
| `/{lang}/{productsPagePermalink}/{...categoryPath}` | Category listing | `CategoryLanding.astro` |
| `/{lang}/{productsPagePermalink}/{...categoryPath}/{productSlug}` | Product detail | `ProductDetail.astro` |

---

## 2. Schema Summary

### 2.1 `globals` (singleton)
`title`, `url`, `tagline`, `description`, `logo`, `logo_dark_mode`, `favicon`, `accent_color`,
`social_links`, `product_url_structure`, `phone`, `address`, `email`, `footer_image`.

### 2.2 `navigation` + `navigation_items`
Relational menu system (`navigation` = named menu, `navigation_items` with `title`, `type`,
`page`/`post`/`url`, self-referential `parent`/`children`). Used by `Navbar.astro` and
`Footer.astro` via `fetchNavigation(id)`.

### 2.3 Product catalog (content only — no layout fields)
`products`, `product_variants`, `product_specs` (+ `product_spec_groups`,
`product_spec_variant_values` for comparison tables), `product_pricing_tiers`,
`product_regional_prices`, `product_certifications`, `product_brands`, `product_units`,
`product_categories`. Translatable fields include `tagline` and `model_range` on
`products_translations`, and `tagline` and `model_list` on `product_categories_translations`.

### 2.4 `product_categories`
`id`, `slug`, `parent`, `image`, `cover_image`, `listing_layout`, `show_subcategories_bar`,
`brand` (M2O → `product_brands`), `seo`, `default_page_template`, `blocks` (M2A — page
builder blocks on the category landing page, with `position: "above" | "below"` relative to
the product grid). Per-category `spec_layout` was removed — spec presentation is now
configured per-block via `block_product_specs.layout` (see 2.5).

### 2.5 Product page builder (tabs/template-blocks model)
```
product_page_templates → product_page_tabs (sort) → product_template_blocks (M2A)
  → one of the block_product_* "layout block" collections
```
- `product_template_blocks` / `product_blocks` are M2A junctions (`collection` + `item`,
  `hide_block`, `sort`) — same pattern as `pages.blocks`.
- `block_product_specs` and `block_product_card_grid` are dual-allowed: they can live at
  the template level (shared default) or per-product in `product_blocks` (override/addition).
- `block_product_specs.layout`: `table | accordion | comparison_table |
  comparison_accordion | numbered_list | feature_grid`. `comparison_*` layouts read
  `product_spec_variant_values` for per-variant cells.
- `block_product_specs.show_media` + `media_position` (`left | right | both`) render
  per-product `product_media` items (generic tagged O2M: `purpose`, `position`, `image`) —
  e.g. engineering drawings alongside the spec table.
- A product's effective template cascades: `product.page_template` →
  `product.category.default_page_template` → code-level `DEFAULT_PRODUCT_PAGE_TEMPLATE`
  (`frontend/src/lib/catalog.ts`).

Full collection-by-collection reference: [product-catalog-schema.sql](../../directus/schema/product-catalog-schema.sql).

---

## 3. Page Structure

### 3.1 Homepage
Page builder blocks via `PageBlocks.astro`: `block_hero_slider`, `block_features_grid`
(`showcase_left`/`showcase_right`/grid layouts), `block_product_category_cards`
(image + video-on-hover), `block_numbered_list` (`image_left`/`image_right`),
`block_brands_logos`, `block_cta_banner`, `block_richtext`, `block_posts`, `block_products`,
`block_product_categories`. `Navbar.astro` is fixed/transparent and transitions to solid on
scroll; `Footer.astro` uses `globals.footer_image`, `email`, `phone`, `address`, and the
`navigation` collection for its link columns.

### 3.2 Category Listing Page (`CategoryLanding.astro`)
1. Dark hero: `cover_image` background, breadcrumb, `translations.tagline`,
   `translations.name`, `translations.description`, CTA to the products index.
2. Subcategory pill bar (`show_subcategories_bar`).
3. `category.blocks` (M2A, `position: "above"`) rendered above the product grid.
4. Product grid: portrait cards, brand badge from `category.brand.logo`,
   `translations.model_list` shown under the product name.
5. `category.blocks` (`position: "below"`) rendered below the grid.

### 3.3 Product Detail Page (`ProductDetail.astro`)
Section visibility/order is driven by `getTemplateBlocks(resolveTemplate(product))`
(flattened, `hide_block`-filtered, sorted `product_template_blocks` across all tabs) plus
the product's own `product_blocks`:

1. **Breadcrumb bar** — shown if the resolved template's `block_product_hero.show_breadcrumb`
   is true and the product has a category.
2. **Hero** (dark, two-column) — category tagline, `translations.name`,
   `translations.tagline`, `translations.model_range`, CTA buttons, product image.
3. **Key Features** — `block_features_grid` items from `product_blocks`, shown if the
   template includes `block_product_content_slot`.
4. **Technical Specifications** — `block_product_specs` items from `product_blocks`,
   rendered via `ProductSpecs.astro` per `layout` (table / accordion / comparison /
   numbered list / feature grid), with optional `product_media` drawings alongside
   (`show_media` + `media_position`).
5. **Photo gallery strip** — `product.gallery`, shown if the template includes
   `block_product_gallery`.
6. **Other content blocks** (e.g. CTA banners) — remaining `product_blocks`, shown if the
   template includes `block_product_content_slot`.
7. **Certifications** — shown if the template or `product_blocks` has a
   `block_product_card_grid` with `source: "certifications"`.
8. **Volume Pricing** — `product.pricing_tiers`, shown if the template includes
   `block_product_pricing_table`.
9. **Related Products** — `product.related_products`, shown if the template includes
   `block_product_related`.

---

## 4. Design System (still current)

### Colours
- Accent: `text-(--accent)` / `bg-(--accent)` — from `globals.accent_color`
- Dark sections: `bg-slate-900` / `bg-zinc-950` with `text-white` / `text-slate-50`
- Light sections: `bg-white text-slate-900`
- Tagline labels: uppercase, tracked, accent colour

### Typography
- Taglines: `text-xs font-semibold tracking-widest uppercase text-(--accent)`
- H1: `text-4xl md:text-5xl font-extrabold leading-tight`
- H2/Section: `text-3xl md:text-4xl font-bold`
- H5 label: `text-sm font-bold tracking-wide uppercase`
- Number badges: `text-5xl md:text-6xl font-extrabold text-(--accent) opacity-30`

### Spacing
- Section padding: `py-20 md:py-28`
- Inner container: `max-w-6xl mx-auto px-6 md:px-16` (product detail uses `max-w-7xl` for
  the specs section)

### Buttons
- Primary: `bg-(--accent) text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90`
  (or `rounded-full` pill for CTA banners)
- Outline: `border border-current px-6 py-3 rounded-lg font-semibold hover:bg-white/10`
- Arrow link: `text-(--accent) font-semibold hover:underline` + inline arrow

### Images
- Product hero: full-bleed, fills right column, no border-radius
- Category cards: portrait/landscape with dark overlay, text at bottom
- Brand logos: `grayscale hover:grayscale-0 transition`
