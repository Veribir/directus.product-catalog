-- ============================================================================
-- Barkomas — Product Catalog & Product Page-Builder Block Schema
-- ============================================================================
-- SINGLE SOURCE OF TRUTH for the product catalog + product detail page
-- builder. Supersedes all prior product-catalog-schema-v2/v3/v4/v5.sql
-- drafts (deleted — kept here as one consolidated design).
--
-- DESIGN PRINCIPLES
--   - Product catalog (products, variants, specs, pricing, etc.) is pure
--     CONTENT — no presentation/layout fields. Translatable wherever the
--     value is shown to end users (name, description, captions, labels...).
--   - Per-product GENERIC content collections (product_media,
--     product_highlights, product_options, product_documents, product_faqs)
--     hold data that ANY future Astro design can read — adding a new design
--     should not require new Directus collections.
--   - Presentation/layout (image position, CTA buttons, card styles, section
--     order/visibility, tabs) lives ENTIRELY in a generic BLOCK system that
--     mirrors Directus's pages -> page_blocks pattern:
--       product_page_templates -> product_page_tabs -> product_template_blocks
--       (M2A) -> one of the block_product_* "layout block" collections.
--   - block_product_specs and block_product_card_grid are config-only blocks
--     that may appear EITHER at the template level (product_template_blocks
--     — shared default for all products on that template) OR per-product
--     (product_blocks — override/addition for one product, e.g. a custom
--     spec layout), exactly like Bulldrill's current block_product_specs use.
--
-- Sections:
--   1.  Lookup / supporting collections
--   2.  Spec groups
--   3.  Product page templates + tabs
--   4.  Categories
--   5.  Products
--   6.  Variants
--   7.  Specs + per-variant spec values
--   8.  Pricing (tiers, regional prices, regions, RFQ)
--   9.  M2M junction tables
--   10. Generic per-product content collections (media, highlights, options,
--       documents, faqs)
--   11. Page-builder M2A junctions (product_blocks, product_category_blocks,
--       product_template_blocks)
--   12. Product layout block collections
--   13. Other product-related content blocks
--   14. Migration notes
--   15. Relation summary
-- ============================================================================


-- ============================================================================
-- 1. LOOKUP / SUPPORTING COLLECTIONS
-- ============================================================================

CREATE TABLE product_units (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  code varchar(255) NOT NULL,                   -- stable identifier, e.g. "kg"
  symbol varchar(255),                          -- e.g. "m²", "°C"
  category varchar(255),                        -- count | mass | length | area | volume | time | other
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_units_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_units_id uuid REFERENCES product_units(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name_singular varchar(255) NOT NULL,
  name_plural varchar(255),
  abbreviation varchar(255)
);

CREATE TABLE product_brands (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  slug varchar(255) NOT NULL,
  logo uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  website varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_brands_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_brands_id uuid REFERENCES product_brands(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text
);

CREATE TABLE customer_groups (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  code varchar(255) NOT NULL,                   -- stable identifier, e.g. "wholesale"
  default_discount_pct integer,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE customer_groups_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_groups_id uuid REFERENCES customer_groups(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text
);

CREATE TABLE product_regions (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  code varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  currency varchar(255) NOT NULL,               -- ISO 4217
  countries json,                               -- [{ code: "US" }, ...]
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_tags (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  slug varchar(255) NOT NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_tags_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_tags_id uuid REFERENCES product_tags(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description varchar(255)
);

CREATE TABLE product_certifications (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  certificate_number varchar(255),
  issuer varchar(255),
  issued_at date,
  expires_at date,
  document uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_certifications_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_certifications_id uuid REFERENCES product_certifications(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text
);


-- ============================================================================
-- 2. SPEC GROUPS
-- ============================================================================

-- Spec groups are catalog-wide and shared: one group (e.g. "Drilling Capacity")
-- is reused across many products' variants — there is NO per-product ownership
-- column and NO scoping mechanism (no is_global flag, no products M2M). A
-- group simply exists in the catalog and is pulled in wherever a variant
-- attaches it via product_variant_spec_groups (section 7).
CREATE TABLE product_spec_groups (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  icon varchar(255),                            -- Material Symbols icon name
  irdi varchar(255),                            -- eCl@ss IRDI for this property group
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
  -- specs -> o2m alias -> product_specs.group (reverse; specs across any product using this group)
  -- variant_groups -> o2m alias -> product_variant_spec_groups.spec_group (reverse; section 7)
);

CREATE TABLE product_spec_groups_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_spec_groups_id uuid REFERENCES product_spec_groups(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  note text
);


-- ============================================================================
-- 3. PRODUCT PAGE TEMPLATES + TABS
-- ============================================================================
-- A template is a named, reusable layout: an ordered list of TABS, each tab
-- an ordered list of BLOCKS (product_template_blocks, section 11/12). If a
-- template has only one tab, the frontend renders it flat (no tab nav) — a
-- tabbed UI is opt-in by adding more tabs, not a separate schema mode.
--
-- Section visibility AND order are expressed entirely by which tabs/blocks
-- exist and their `sort` — there is NO separate `sections`/`gallery_layout`/
-- `show_*` config on this table (that legacy design is fully replaced).

CREATE TABLE product_page_templates (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  name varchar(255) NOT NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
  -- tabs -> alias o2m -> product_page_tabs.product_page_templates_id (sort_field="sort")
);

CREATE TABLE product_page_tabs (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',      -- draft | published | archived
  sort integer,
  product_page_templates_id uuid REFERENCES product_page_templates(id) ON DELETE CASCADE,
  -- o2m alias = product_page_templates.tabs, sort_field="sort"
  key varchar(255) NOT NULL,
  -- machine slug for routing/anchors/analytics, e.g. "overview", "specifications",
  -- "parts_options", "downloads", "faq" — NOT translatable (stable identifier)
  icon varchar(255),                            -- optional icon name for tab nav
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_page_tabs_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_page_tabs_id uuid REFERENCES product_page_tabs(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  label varchar(255) NOT NULL                   -- visible tab label, e.g. "Parts & Options"
);


-- ============================================================================
-- 4. CATEGORIES
-- ============================================================================

CREATE TABLE product_categories (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  slug varchar(255) NOT NULL,
  parent uuid REFERENCES product_categories(id) ON DELETE SET NULL,   -- self-ref, sort_field="sort", o2m alias = children
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  cover_image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  listing_layout varchar(255),                  -- grid_3 | grid_4 | grid_2 | list
  show_subcategories_bar boolean,
  seo json,
  default_page_template uuid REFERENCES product_page_templates(id) ON DELETE SET NULL,
  eclass_code varchar(255),
  eclass_version varchar(255),
  brand uuid REFERENCES product_brands(id) ON DELETE SET NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_categories_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_categories_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  slug varchar(255),                            -- localized override; falls back to product_categories.slug
  tagline varchar(255),
  model_list varchar(255)
);


-- ============================================================================
-- 5. PRODUCTS
-- ============================================================================

CREATE TABLE products (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | in_review | published | archived
  slug varchar(255) NOT NULL,
  sku varchar(255),
  price numeric(12,2),
  compare_at_price numeric(12,2),
  category uuid REFERENCES product_categories(id) ON DELETE SET NULL,   -- primary category
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  seo json,
  page_template uuid REFERENCES product_page_templates(id) ON DELETE SET NULL,
  product_type varchar(255) DEFAULT 'standard', -- standard | consumable | service | configurable
  brand uuid REFERENCES product_brands(id) ON DELETE SET NULL,
  unit uuid REFERENCES product_units(id) ON DELETE SET NULL,
  unit_quantity numeric(12,4) DEFAULT 1,
  rfq_enabled boolean,
  rfq_min_quantity integer,
  rfq_lead_time_days integer,
  eclass_code varchar(255),                     -- overrides category.eclass_code if set
  eclass_version varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE products_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  display_title varchar(255),
  -- Marketing-facing title shown on the website. Falls back to `name` if
  -- empty. Solves: name = "BM-0045" (internal/catalog identifier) but
  -- display_title = "Big Mug" for the public site. Pure content — stays on
  -- the product, same as name/description (not presentation config).
  description text,
  content text,                                 -- rich-text HTML
  slug varchar(255),                            -- localized override; falls back to products.slug
  tagline varchar(255),
  model_range varchar(255)
);


-- ============================================================================
-- 6. VARIANTS
-- ============================================================================

CREATE TABLE product_variants (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  product uuid REFERENCES products(id) ON DELETE CASCADE,   -- o2m alias = products.variants, sort_field="sort"
  sku varchar(255),
  price numeric(12,2),
  compare_at_price numeric(12,2),
  stock integer,
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  options json,                                 -- [{ attribute, value }, ...]
  low_stock_threshold integer,
  reorder_point integer,
  reorder_quantity integer,
  unit_override uuid REFERENCES product_units(id) ON DELETE SET NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_variants_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_variants_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255)                             -- e.g. "Red / XL"
);


-- ============================================================================
-- 7. SPECS + PER-VARIANT SPEC GROUPS/VALUES
-- ============================================================================
-- Domain constraint: every product has at least one variant (no single-SKU
-- products exist), so ALL spec values are entered and stored per variant.
-- There is no product-level/base value and no product-side entry surface —
-- the variant is the ONLY door for filling in spec data (see product_variant_
-- spec_groups below). product_specs itself stays catalog-wide: a canonical,
-- reusable definition (label/unit/irdi/display_type) with no product or
-- variant ownership column.

CREATE TABLE product_specs (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  "group" uuid REFERENCES product_spec_groups(id) ON DELETE SET NULL,
  unit uuid REFERENCES product_units(id) ON DELETE SET NULL,
  display_type varchar(255),                    -- text | boolean | number | range | list
  irdi varchar(255),                            -- eCl@ss IRDI for this individual property
  eclass_preferred_name varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
  -- spec_variant_values -> o2m alias -> product_spec_variant_values.spec (reverse)
);

CREATE TABLE product_specs_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_specs_id uuid REFERENCES product_specs(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  label varchar(255) NOT NULL,
  note text
  -- NOTE: there is no `value` column here. A spec definition has no base/
  -- product-level value — every value lives on product_spec_variant_values
  -- below, scoped to a specific variant.
);

-- A per-variant INSTANCE of a spec group: "this variant has values for this
-- group." This is the real entry surface — open a variant, add a group here,
-- then fill in its values below. Both FKs are NOT NULL: a row with no variant
-- or no group is meaningless.
CREATE TABLE product_variant_spec_groups (
  id uuid PRIMARY KEY,
  sort integer,
  spec_group uuid NOT NULL REFERENCES product_spec_groups(id) ON DELETE CASCADE,
  product_variant uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  -- o2m alias = product_variants.variant_spec_groups, sort_field="sort"
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
  -- variant_spec_values -> o2m alias -> product_spec_variant_values.variant_spec_group (reverse)
);

-- One row per (spec, variant) cell value. `spec_group` is stored here too —
-- alongside product_specs.group and product_variant_spec_groups.spec_group —
-- as a DELIBERATE denormalization so this table can be filtered/queried by
-- group without joining through both spec and variant_spec_group. All three
-- FKs are NOT NULL.
CREATE TABLE product_spec_variant_values (
  id uuid PRIMARY KEY,
  sort integer,
  spec uuid NOT NULL REFERENCES product_specs(id) ON DELETE CASCADE,
  -- o2m alias = product_specs.spec_variant_values
  spec_group uuid NOT NULL REFERENCES product_spec_groups(id) ON DELETE SET NULL,
  -- denormalized copy of spec.group / variant_spec_group.spec_group — see note above
  variant_spec_group uuid NOT NULL REFERENCES product_variant_spec_groups(id) ON DELETE CASCADE,
  -- the variant + group this cell belongs to; variant is reached via
  -- variant_spec_group.product_variant (there is no direct `variant` column)
  value varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);


-- ============================================================================
-- 8. PRICING (TIERS, REGIONAL PRICES, REGIONS, RFQ)
-- ============================================================================

CREATE TABLE product_pricing_tiers (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  product uuid REFERENCES products(id) ON DELETE CASCADE,            -- o2m alias = products.pricing_tiers, sort_field="sort"
  variant uuid REFERENCES product_variants(id) ON DELETE SET NULL,   -- optional — null = applies to all variants
  label varchar(255),
  min_quantity integer NOT NULL,
  max_quantity integer,
  price numeric(12,2) NOT NULL,
  customer_group uuid REFERENCES customer_groups(id) ON DELETE SET NULL,
  note text,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_regional_prices (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'draft',          -- draft | published
  product uuid REFERENCES products(id) ON DELETE CASCADE,            -- o2m alias = products.regional_prices, sort_field="sort"
  variant uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  region uuid NOT NULL REFERENCES product_regions(id) ON DELETE SET NULL,
  price numeric(12,2) NOT NULL,
  compare_at_price numeric(12,2),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_rfq_requests (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'pending',        -- pending | reviewing | quoted | accepted | rejected | expired
  product uuid REFERENCES products(id) ON DELETE SET NULL,
  variant uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  requested_sku varchar(255),                   -- denormalized snapshot
  quantity integer NOT NULL,
  unit uuid REFERENCES product_units(id) ON DELETE SET NULL,
  target_price numeric(12,2),
  customer_group uuid REFERENCES customer_groups(id) ON DELETE SET NULL,
  message text,
  company_name varchar(255),
  contact_name varchar(255) NOT NULL,
  contact_email varchar(255) NOT NULL,
  contact_phone varchar(255),
  quoted_price numeric(12,2),
  quote_valid_until timestamptz,
  quote_message text,
  internal_notes text,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);


-- ============================================================================
-- 9. M2M JUNCTION TABLES
-- ============================================================================

-- products.additional_categories (M2M, secondary category cross-listing)
CREATE TABLE products_categories (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_categories_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  sort integer
);

-- products.certifications (M2M)
CREATE TABLE products_certifications (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_certifications_id uuid REFERENCES product_certifications(id) ON DELETE CASCADE,
  obtained_at date
);

-- products.gallery (M2M to directus_files)
CREATE TABLE products_files (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,
  directus_files_id uuid REFERENCES directus_files(id) ON DELETE CASCADE,
  sort integer
);

-- products.related_products (self-M2M)
CREATE TABLE products_related (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,         -- owning product
  related_products_id uuid REFERENCES products(id) ON DELETE CASCADE, -- related product
  sort integer
);

-- products.tags (M2M)
CREATE TABLE products_tags (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_tags_id uuid REFERENCES product_tags(id) ON DELETE CASCADE
);

-- NOTE: products_spec_groups (M2M linking products to non-global spec groups)
-- has been DROPPED. Spec groups no longer have any product-scoping mechanism —
-- see section 7 for the current variant-only model.


-- ============================================================================
-- 10. GENERIC PER-PRODUCT CONTENT COLLECTIONS
-- ============================================================================
-- Pure DATA, no presentation fields (no display_style/layout/columns). Any
-- Astro design queries these and decides how to render. Replaces the
-- single-purpose block_product_specs_drawings (now product_media).

-- ── 10.1 product_media — generic tagged asset bucket ───────────────────
-- Engineering drawings, diagrams, certificates, datasheet snippets, etc.

CREATE TABLE product_media (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  product uuid REFERENCES products(id) ON DELETE CASCADE,
  -- o2m alias = products.media, sort_field="sort"
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  purpose varchar(255) NOT NULL DEFAULT 'spec_drawing',
  -- purpose enum (extensible): spec_drawing | diagram | certificate | datasheet | other
  position varchar(255),                        -- left | right | center (meaning is design-defined)
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_media_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_media_id uuid REFERENCES product_media(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  caption varchar(255)
);

-- ── 10.2 product_highlights — generic callout / feature items ──────────
-- Covers numbered "Key Features" lists (kind=feature, sort=number),
-- capability/operational grids (kind=capability), short stat badges
-- (kind=stat), and highlight cards (kind=highlight). Display style is
-- entirely an Astro template decision based on `kind` + design.

CREATE TABLE product_highlights (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  product uuid REFERENCES products(id) ON DELETE CASCADE,
  -- o2m alias = products.highlights, sort_field="sort"
  kind varchar(255) NOT NULL DEFAULT 'highlight',  -- highlight | capability | feature | stat
  icon varchar(255),
  accent_color varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_highlights_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_highlights_id uuid REFERENCES product_highlights(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  value varchar(255)                            -- short value for kind='stat', e.g. "12-16 Weeks"
);

-- ── 10.3 product_options — parts / accessories / spares ─────────────────
-- Feeds a future "Standard & Optional Equipment" / Parts & Options section.

CREATE TABLE product_options (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  product uuid REFERENCES products(id) ON DELETE CASCADE,
  -- o2m alias = products.options, sort_field="sort"
  sku varchar(255),
  category varchar(255) NOT NULL DEFAULT 'standard',  -- standard | optional | spare
  price numeric(12,2),                          -- nullable: "Included" items have no price
  stock_status varchar(255) DEFAULT 'in_stock', -- in_stock | included | quote_only | out_of_stock
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_options_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_options_id uuid REFERENCES product_options(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text
);

-- ── 10.4 product_documents — downloadable files ──────────────────────────
-- Feeds a future "Document Vault" / Downloads section.

CREATE TABLE product_documents (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  product uuid REFERENCES products(id) ON DELETE CASCADE,
  -- o2m alias = products.documents, sort_field="sort"
  file uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  category varchar(255) NOT NULL DEFAULT 'other',
  -- engineering_drawings | cae_data | software_firmware | tender_specs | other
  revision varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_documents_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_documents_id uuid REFERENCES product_documents(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  title varchar(255) NOT NULL
);

-- ── 10.5 product_faqs — per-product Q&A ──────────────────────────────────
-- Feeds a future "Knowledge Base & FAQ" section. Tags reuse the existing
-- product_tags taxonomy via M2M.

CREATE TABLE product_faqs (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  product uuid REFERENCES products(id) ON DELETE CASCADE,
  -- o2m alias = products.faqs, sort_field="sort"
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE product_faqs_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_faqs_id uuid REFERENCES product_faqs(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  question varchar(500) NOT NULL,
  answer text NOT NULL
);

CREATE TABLE product_faqs_product_tags (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_faqs_id uuid REFERENCES product_faqs(id) ON DELETE CASCADE,
  product_tags_id uuid REFERENCES product_tags(id) ON DELETE CASCADE
);


-- ============================================================================
-- 11. PAGE-BUILDER M2A JUNCTIONS
-- ============================================================================
-- `item` is a generic string PK — it has NO foreign key constraint because it
-- can point into ANY of the collections listed in `one_allowed_collections`
-- (Directus M2A polymorphic relation; "collection" + "item" together form the
-- composite reference, resolved app-side).

-- products.blocks — PER-PRODUCT custom content + per-product overrides
CREATE TABLE product_blocks (
  id uuid PRIMARY KEY,
  sort integer,
  products_id uuid REFERENCES products(id) ON DELETE CASCADE,   -- o2m alias = products.blocks
  collection varchar(255),       -- block type collection name (no FK — polymorphic)
  item varchar(255),             -- PK of the block item in `collection` (no FK — polymorphic)
  hide_block boolean,
  background varchar(255),       -- light | dark
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);
-- one_allowed_collections (product_blocks.item):
--   block_hero, block_richtext, block_posts, block_products,
--   block_product_categories, block_numbered_list, block_cta_banner,
--   block_features_grid, block_brands_logos,
--   block_product_specs, block_product_card_grid
--   (the latter two are config-only blocks ALSO allowed at the template
--   level via product_template_blocks — see section 12. A product can rely
--   on the template's default, or add/override its own here, exactly like
--   Bulldrill's current per-product block_product_specs.)

-- product_categories.blocks — category landing page content
CREATE TABLE product_category_blocks (
  id uuid PRIMARY KEY,
  sort integer,
  product_categories_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,  -- o2m alias = product_categories.blocks
  collection varchar(255),       -- block type collection name (no FK — polymorphic)
  item varchar(255),             -- PK of the block item in `collection` (no FK — polymorphic)
  hide_block boolean,
  background varchar(255),       -- light | dark
  position varchar(255),         -- above | below the implicit product grid
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);
-- one_allowed_collections (product_category_blocks.item):
--   block_hero, block_richtext, block_posts, block_products,
--   block_product_categories, block_numbered_list, block_cta_banner,
--   block_features_grid, block_brands_logos, block_product_category_cards,
--   block_hero_slider
--
-- NOTE: block_product_specs / block_product_card_grid are intentionally NOT
-- in this list — they require per-product data (specs/variants/highlights)
-- not available on category landing pages.

-- product_page_tabs.blocks — TEMPLATE-LEVEL layout/structure (shared across
-- all products using a given template)
CREATE TABLE product_template_blocks (
  id uuid PRIMARY KEY,
  sort integer,
  product_page_tabs_id uuid REFERENCES product_page_tabs(id) ON DELETE CASCADE,
  -- o2m alias = product_page_tabs.blocks, sort_field="sort"
  collection varchar(255),       -- block type collection name (polymorphic, no FK)
  item varchar(255),             -- PK of the block item in `collection` (polymorphic, no FK)
  hide_block boolean,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);
-- one_allowed_collections (product_template_blocks.item):
--   block_product_hero, block_product_gallery, block_product_buybox,
--   block_product_description, block_product_specs, block_product_card_grid,
--   block_product_cta_group, block_product_options, block_product_documents,
--   block_product_faq, block_product_pricing_table, block_product_related,
--   block_product_content_slot
--
-- NOTE: unlike page_blocks/product_blocks, there's no `background` field —
-- background colour is a content-presentation concern; layout blocks are
-- structural. Add it back later if a template ever needs per-section bg.


-- ============================================================================
-- 12. PRODUCT LAYOUT BLOCK COLLECTIONS
-- ============================================================================
-- Each block type configures ONE product-detail-page section. Fields are
-- presentation/positioning config — actual data (title, price, specs,
-- highlights, options, documents, faqs, images...) always comes from
-- products / product_specs / product_highlights / etc (sections 5-10).
-- Usable from product_template_blocks (template default) and, for
-- block_product_specs / block_product_card_grid, also from product_blocks
-- (per-product override — see section 11).

-- ── 12.1 Hero / title area ──────────────────────────────────────────────
CREATE TABLE block_product_hero (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  show_breadcrumb boolean DEFAULT true,
  show_tagline boolean DEFAULT true,
  show_model_range boolean DEFAULT true,
  show_stats boolean DEFAULT true,
  -- pulls product_highlights rows where kind='stat' for this product
  image_position varchar(255) DEFAULT 'right',  -- left | right | full_bleed | none
  cta_style varchar(255) DEFAULT 'quote_only',
  -- quote_only        -> primary RFQ-style CTAs (block_product_cta_group)
  -- cart_and_wishlist -> qty selector + add-to-quote + wishlist
  -- both              -> render both groups
  enable_zoom boolean DEFAULT true,             -- magnifier / "hover to inspect"
  enable_floorplan_view boolean DEFAULT false,  -- floor-plan / schematic icon
  enable_3d_view boolean DEFAULT false          -- 3D / AR cube icon
);

-- ── 12.2 Gallery ─────────────────────────────────────────────────────────
CREATE TABLE block_product_gallery (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  layout varchar(255) DEFAULT 'thumbnails',     -- thumbnails | carousel | grid
  enable_zoom boolean DEFAULT true,
  enable_floorplan_view boolean DEFAULT false,
  enable_3d_view boolean DEFAULT false
);

-- ── 12.3 Buy box: price / brand / SKU / variants ────────────────────────
CREATE TABLE block_product_buybox (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  show_price boolean DEFAULT true,
  show_brand boolean DEFAULT true,
  show_sku boolean DEFAULT true,
  show_variants boolean DEFAULT true,
  layout varchar(255) DEFAULT 'stacked'         -- stacked | inline
);

-- ── 12.4 Description / rich content ─────────────────────────────────────
CREATE TABLE block_product_description (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  style varchar(255) DEFAULT 'default'          -- default | with_sidebar
);

-- ── 12.5 Specifications ──────────────────────────────────────────────────
-- Defines HOW a product's spec data (product_specs / product_spec_variant_
-- values, section 7) is rendered. Holds no spec values itself.
-- ALLOWED in both product_template_blocks (shared default for the template)
-- AND product_blocks (per-product override/addition — e.g. one product needs
-- comparison_accordion while the template default is table).

CREATE TABLE block_product_specs (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  layout varchar(255) DEFAULT 'table',
  -- table | accordion | comparison_table | comparison_accordion
  -- | numbered_list | feature_grid
  spec_group uuid REFERENCES product_spec_groups(id) ON DELETE SET NULL,
  -- NULL = render all spec groups from the product; set = limit to one group
  show_media boolean DEFAULT false,
  -- if true, render the product's product_media items where purpose='spec_drawing'
  media_position varchar(255) DEFAULT 'left'    -- left | right | both
);

-- ── 12.6 Generic card grid ───────────────────────────────────────────────
-- Reusable cards UI: highlight cards, capability/operational grids,
-- certification badges, options/parts cards, or arbitrary one-off cards.
-- ALLOWED in both product_template_blocks AND product_blocks (same rationale
-- as block_product_specs).

CREATE TABLE block_product_card_grid (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  source varchar(255) NOT NULL DEFAULT 'highlights',
  -- highlights | capabilities | certifications | options | custom_items
  -- highlights/capabilities -> product_highlights filtered by kind
  -- certifications          -> products_certifications M2M
  -- options                 -> product_options
  -- custom_items            -> block_product_card_grid_items (below)
  display_style varchar(255) NOT NULL DEFAULT 'feature_cards',
  -- feature_cards | icon_grid | badge_grid | numbered_list | list
  columns integer DEFAULT 3,                    -- 2 | 3 | 4
  "limit" integer                               -- nullable: cap number of items shown
);

-- Inline items, only used when source='custom_items'
CREATE TABLE block_product_card_grid_items (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  block_product_card_grid_id uuid REFERENCES block_product_card_grid(id) ON DELETE CASCADE,
  -- o2m alias = block_product_card_grid.items, sort_field="sort"
  icon varchar(255),
  accent_color varchar(255)
);

CREATE TABLE block_product_card_grid_items_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_product_card_grid_items_id uuid REFERENCES block_product_card_grid_items(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text
);

-- ── 12.7 Reusable CTA buttons ────────────────────────────────────────────
CREATE TABLE block_product_cta_group (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  layout varchar(255) DEFAULT 'inline'          -- inline | stacked
  -- buttons -> alias o2m -> block_product_cta_group_buttons (sort_field="sort")
);

CREATE TABLE block_product_cta_group_buttons (
  id uuid PRIMARY KEY,
  sort integer,
  status varchar(255) DEFAULT 'published',
  block_product_cta_group_id uuid REFERENCES block_product_cta_group(id) ON DELETE CASCADE,
  style varchar(255) DEFAULT 'primary',         -- primary | secondary | outline
  action_type varchar(255) DEFAULT 'link',      -- link | form
  url varchar(500),                             -- used when action_type='link'
  form uuid REFERENCES forms(id) ON DELETE SET NULL
  -- used when action_type='form' — opens/embeds an existing Directus form
  -- (e.g. "Request Technical Quote" -> RFQ form). Same `forms` collection
  -- used by the page-builder block_form.
);

CREATE TABLE block_product_cta_group_buttons_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_product_cta_group_buttons_id uuid REFERENCES block_product_cta_group_buttons(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  label varchar(255) NOT NULL
);

-- ── 12.8 Standard & Optional Equipment ───────────────────────────────────
CREATE TABLE block_product_options (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  show_category_filters boolean DEFAULT true,   -- "All / Standard / Optional / Spare" tabs
  show_price boolean DEFAULT true,
  columns integer DEFAULT 2
);

-- ── 12.9 Document Vault ───────────────────────────────────────────────────
CREATE TABLE block_product_documents (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  display_style varchar(255) DEFAULT 'accordion',  -- accordion | flat_list
  group_by_category boolean DEFAULT true
);

-- ── 12.10 Knowledge Base & FAQ ────────────────────────────────────────────
CREATE TABLE block_product_faq (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  show_tag_filters boolean DEFAULT true
);

-- ── 12.11 Volume / tier pricing table ────────────────────────────────────
CREATE TABLE block_product_pricing_table (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  display_style varchar(255) DEFAULT 'table'    -- table | cards
);

-- ── 12.12 Related products ────────────────────────────────────────────────
CREATE TABLE block_product_related (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published',
  layout varchar(255) DEFAULT 'grid_4',         -- grid_2 | grid_3 | grid_4 | list
  "limit" integer DEFAULT 4
);

-- ── 12.13 Custom content slot ─────────────────────────────────────────────
-- Marker block: "render this product's own product_blocks (custom
-- richtext/CTA/feature-grid/etc, section 11) at this position in the layout."
-- No config fields — its position in product_template_blocks.sort IS the config.
CREATE TABLE block_product_content_slot (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'published'
);


-- ============================================================================
-- 13. OTHER PRODUCT-RELATED CONTENT BLOCKS
-- ============================================================================
-- Full DDL for general-purpose page blocks (block_hero, block_richtext,
-- block_posts, block_numbered_list, block_cta_banner, block_brands_logos,
-- block_hero_slider) is out of scope here — see PAGE_FIELDS / BLOCK_ITEM_FIELDS
-- in frontend/src/lib/api.ts for their fields. The product/category-specific
-- blocks below are included for completeness.

CREATE TABLE block_features_grid (
  id uuid PRIMARY KEY,
  status varchar(255),                          -- draft | published | archived
  sort integer,
  layout varchar(255),           -- grid_2 | grid_3 | grid_4 | showcase_left | showcase_right
  cta_url varchar(255),
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  image_link varchar(255)
);

CREATE TABLE block_features_grid_items (
  id uuid PRIMARY KEY,
  sort integer,
  block_features_grid_id uuid REFERENCES block_features_grid(id) ON DELETE CASCADE,  -- o2m alias = block_features_grid.items
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,
  link_url varchar(255)
);

CREATE TABLE block_features_grid_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_features_grid_id uuid REFERENCES block_features_grid(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  tagline varchar(255),
  headline varchar(255),
  description text,
  cta_label varchar(255),
  image_title varchar(255)
);

CREATE TABLE block_features_grid_items_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_features_grid_items_id uuid REFERENCES block_features_grid_items(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  headline varchar(255),
  description text
);

-- Renders a grid/list of product categories (homepage / landing pages)
CREATE TABLE block_product_categories (
  id uuid PRIMARY KEY,
  status varchar(255) DEFAULT 'draft',          -- draft | published | archived
  parent_category uuid REFERENCES product_categories(id) ON DELETE SET NULL,  -- empty = top-level categories
  depth varchar(255),                           -- "1" | "2"
  layout varchar(255),                          -- grid_3 | grid_4 | grid_2 | list
  show_product_count boolean,
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE block_product_categories_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_product_categories_id uuid REFERENCES block_product_categories(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  tagline varchar(255),
  headline text
);

-- Large visual category card grid (e.g. brand landing pages)
CREATE TABLE block_product_category_cards (
  id uuid PRIMARY KEY,
  status varchar(255),                          -- draft | published | archived
  sort integer,
  brand_logo uuid REFERENCES directus_files(id) ON DELETE SET NULL
);

CREATE TABLE block_product_category_cards_items (
  id uuid PRIMARY KEY,
  sort integer,
  block_product_category_cards_id uuid REFERENCES block_product_category_cards(id) ON DELETE CASCADE,  -- o2m alias = ...cards.cards
  category uuid REFERENCES product_categories(id) ON DELETE SET NULL,  -- image/link derived from category if set
  image uuid REFERENCES directus_files(id) ON DELETE SET NULL,         -- fallback if no category linked
  link_url varchar(255),                        -- fallback if no category linked
  video uuid REFERENCES directus_files(id) ON DELETE SET NULL          -- hover-play video
);

CREATE TABLE block_product_category_cards_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_product_category_cards_id uuid REFERENCES block_product_category_cards(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  tagline varchar(255),
  headline varchar(255),
  description text,
  brand_label varchar(255)
);

CREATE TABLE block_product_category_cards_items_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_product_category_cards_items_id uuid REFERENCES block_product_category_cards_items(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  title varchar(255),
  subtitle varchar(255)
);

-- Renders a grid of products (e.g. "Related Products", "Featured", category listing)
CREATE TABLE block_products (
  id uuid PRIMARY KEY,
  collection varchar(255),       -- always "products" (select-radio, single choice)
  "limit" integer,
  category uuid REFERENCES product_categories(id) ON DELETE SET NULL,  -- optional filter
  layout varchar(255),                          -- grid_3 | grid_4 | grid_2 | list
  sort_by varchar(255),          -- sort | date_created_desc | price_asc | price_desc | name_asc
  show_price boolean,
  show_sku boolean,
  show_category_label boolean,
  card_style varchar(255),       -- default | compact | featured
  cta_url varchar(255),
  date_created timestamptz,
  user_created uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  date_updated timestamptz,
  user_updated uuid REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE TABLE block_products_translations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  block_products_id uuid REFERENCES block_products(id) ON DELETE CASCADE,
  languages_code varchar(255) REFERENCES languages(code) ON DELETE CASCADE,
  tagline varchar(255),
  headline text,
  cta_label varchar(255)
);


-- ============================================================================
-- 14. MIGRATION NOTES (Bulldrill Top-Head Drive — current live data)
-- ============================================================================
-- Existing state (current implementation):
--   - product_blocks row -> block_product_specs (layout=comparison_accordion,
--     spec_group=null) with 3 block_product_specs_drawings (position=left)
--   - product_page_templates row with sections=[...]/gallery_layout/show_*
--     (legacy fields, all removed by this schema)
--
-- Migration steps:
--   1. Create a product_page_template (e.g. "Heavy Machinery — Standard")
--      with at least one product_page_tab (key='overview', label="Overview").
--      Populate its product_template_blocks with the equivalent of the old
--      DEFAULT_PRODUCT_PAGE_TEMPLATE sections: block_product_hero
--      (show_breadcrumb=true), block_product_content_slot (renders
--      block_features_grid via product_blocks), block_product_gallery,
--      block_product_card_grid (source=certifications), block_product_related.
--   2. Keep Bulldrill's existing block_product_specs item, but move it from
--      product_blocks to EITHER (a) the template's product_template_blocks
--      if comparison_accordion should be the shared default, or (b) leave it
--      in product_blocks as a per-product override (recommended, since this
--      is the only product currently using this layout). Update its fields:
--      remove drawings, set show_media=true, media_position=left.
--   3. Create 3 product_media rows on the Bulldrill product (purpose=
--      spec_drawing, position=left, image=<same 3 files>, sort 1-3).
--   4. Delete block_product_specs_drawings rows + DROP TABLE
--      block_product_specs_drawings once unreferenced.
--   5. Drop legacy product_page_templates columns: gallery_layout,
--      section_order, show_breadcrumb, show_sku, show_brand, show_specs,
--      show_certifications, show_pricing_table, show_related_products,
--      sections (after templates are migrated to tabs/template_blocks).
--   6. Drop legacy products columns (already removed in a prior session):
--      spec_drawing_1/2/3.


-- ============================================================================
-- 15. RELATION SUMMARY
-- ============================================================================
-- products.category               -> product_categories.id      ON DELETE SET NULL
-- products.page_template           -> product_page_templates.id  ON DELETE SET NULL
-- products.brand                   -> product_brands.id          ON DELETE SET NULL
-- products.unit                    -> product_units.id           ON DELETE SET NULL
-- product_categories.parent        -> product_categories.id      ON DELETE SET NULL (self)
-- product_categories.default_page_template -> product_page_templates.id ON DELETE SET NULL
-- product_categories.brand         -> product_brands.id          ON DELETE SET NULL
-- product_variants.product         -> products.id                ON DELETE CASCADE
-- product_variants.unit_override   -> product_units.id           ON DELETE SET NULL
-- product_specs.group               -> product_spec_groups.id    ON DELETE SET NULL
-- product_specs.unit               -> product_units.id           ON DELETE SET NULL
-- product_variant_spec_groups.spec_group     -> product_spec_groups.id   ON DELETE CASCADE  (NOT NULL)
-- product_variant_spec_groups.product_variant -> product_variants.id     ON DELETE CASCADE  (NOT NULL; alias product_variants.variant_spec_groups)
-- product_spec_variant_values.spec            -> product_specs.id              ON DELETE CASCADE  (NOT NULL)
-- product_spec_variant_values.spec_group      -> product_spec_groups.id        ON DELETE SET NULL (NOT NULL column; denormalized, see section 7)
-- product_spec_variant_values.variant_spec_group -> product_variant_spec_groups.id ON DELETE CASCADE (NOT NULL)
-- product_pricing_tiers.product    -> products.id                ON DELETE CASCADE
-- product_pricing_tiers.variant    -> product_variants.id        ON DELETE SET NULL
-- product_pricing_tiers.customer_group -> customer_groups.id     ON DELETE SET NULL
-- product_regional_prices.product  -> products.id                ON DELETE CASCADE
-- product_regional_prices.variant  -> product_variants.id        ON DELETE SET NULL
-- product_regional_prices.region   -> product_regions.id         ON DELETE SET NULL
--
-- product_page_tabs.product_page_templates_id -> product_page_templates.id ON DELETE CASCADE
-- product_page_tabs_translations.product_page_tabs_id -> product_page_tabs.id ON DELETE CASCADE
--
-- product_media.product             -> products.id               ON DELETE CASCADE
-- product_media.image               -> directus_files.id         ON DELETE SET NULL
-- product_media_translations.product_media_id -> product_media.id ON DELETE CASCADE
-- product_highlights.product        -> products.id               ON DELETE CASCADE
-- product_options.product           -> products.id               ON DELETE CASCADE
-- product_options.image             -> directus_files.id         ON DELETE SET NULL
-- product_documents.product         -> products.id               ON DELETE CASCADE
-- product_documents.file            -> directus_files.id         ON DELETE SET NULL
-- product_faqs.product              -> products.id               ON DELETE CASCADE
-- product_faqs_product_tags.product_faqs_id -> product_faqs.id   ON DELETE CASCADE
-- product_faqs_product_tags.product_tags_id -> product_tags.id   ON DELETE CASCADE
--
-- product_blocks.products_id        -> products.id               ON DELETE CASCADE
-- product_blocks.item               -> (polymorphic, see one_allowed_collections) — NO FK
-- product_category_blocks.product_categories_id -> product_categories.id ON DELETE CASCADE
-- product_category_blocks.item      -> (polymorphic, see one_allowed_collections) — NO FK
-- product_template_blocks.product_page_tabs_id -> product_page_tabs.id ON DELETE CASCADE
-- product_template_blocks.item      -> (polymorphic, see one_allowed_collections) — NO FK
--
-- block_product_specs.spec_group    -> product_spec_groups.id    ON DELETE SET NULL
-- block_product_card_grid_items.block_product_card_grid_id -> block_product_card_grid.id ON DELETE CASCADE
-- block_product_cta_group_buttons.block_product_cta_group_id -> block_product_cta_group.id ON DELETE CASCADE
-- block_product_cta_group_buttons.form -> forms.id                ON DELETE SET NULL
--
-- (each *_translations table: <table>_id -> <table>.id ON DELETE CASCADE,
--  languages_code -> languages.code ON DELETE CASCADE/SET NULL per Directus convention)
-- ============================================================================
