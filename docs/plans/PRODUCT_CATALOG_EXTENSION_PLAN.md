# Product Catalog Extension Plan

## Context

- **Development phase** — no production data, no migration concerns. Existing dummy product data can be wiped and re-seeded freely.
- All new collections follow the exact same conventions as existing ones: UUID PKs, system fields, status, super-header, tabs grouping, translations with `languageField: "name"` + `display_options.languageField: "name"`.
- Every field has a meaningful `note` and `placeholder`. Fields are organised into logical groups/tabs matching the quality of `products` and `posts`.

### Existing schema (do not duplicate)

These collections already exist and the plan extends them rather than recreates them:

| Existing | Notes |
|---|---|
| `products` | Has: `id`, `sort`, `status` (draft/in_review/published/archived), `slug`, `sku`, `price`, `compare_at_price`, `category`, `image`, `seo`, `gallery` (M2M files), `translations`, `variants` (O2M). **No** product-level stock field. |
| `product_variants` | Has: `sku`, `price`, `compare_at_price`, `stock`, `image`, `options` (JSON repeater attribute/value), `translations`. Stock lives here, not on `products`. |
| `product_categories` | Hierarchical (parent self-FK), `slug`, `image`, `translations`. |
| `*_translations` | Standard pattern: `id` (int PK), `<parent>_id` (uuid), `languages_code`, content fields. |
| `products_files` | Junction for gallery. |
| `languages` | Code (PK), name, direction. |

---

## Design Principles

- **Modular** — each feature is independent; can be implemented and deployed one at a time
- **Generic** — spec groups, certifications, regions, units are editor-managed collections, not hardcoded enums
- **Translated** — every user-facing string uses the `_translations` junction pattern with `languageField: "name"`, `display_options.languageField: "name"`, `languageDirectionField: "direction"`, `userLanguage: true`
- **Reusable** — certifications, spec groups, units, regions are standalone collections linkable to multiple products and variants

---

## Module 0 — Units of Measure

**Must be implemented first** — Module 1 (`products.unit`), Module 4 (tier display), and Module 5 (regional price display) all reference it.

### `product_units` collection

**Meta:** `icon: straighten`, group: `product_catalog`, `display_template: {{translations}} ({{code}})`, `sort_field: sort`, `archive_field: status`

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | `draft` · `published` |
| `code` | input (monospace) | `pcs`, `kg`, `m2`, `litre`, `roll` — Stable identifier used in code. Lowercase, no spaces. Cannot be changed safely after use. |
| `symbol` | input (monospace) | `kg`, `m²`, `L`, `pc` — Short display form shown next to prices. Can include special characters. |
| `category` | select-dropdown (choices) | `count` · `mass` · `length` · `area` · `volume` · `time` · `other` — Groups units in the editor picker. |
| `translations` | translations | `languageField: "name_singular"`, `display_options.languageField: "name_singular"` |
| system fields | hidden | |

### `product_units_translations`

Hidden, `group: product_units`, `display_template: {{name_singular}}`

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden int PK | |
| `product_units_id` | hidden uuid | |
| `languages_code` | hidden | |
| `name_singular` | input, required | `kilogram`, `piece`, `square metre` — Localized singular form. |
| `name_plural` | input | `kilograms`, `pieces`, `square metres` — Localized plural form. Falls back to singular if empty. |
| `abbreviation` | input | `kg`, `pc`, `m²` — Localized short symbol. Falls back to `product_units.symbol` if empty. |

### Seed data (recommended)

`pcs`, `kg`, `g`, `m`, `cm`, `mm`, `m2`, `litre`, `ml`, `hour`, `day`, `roll`, `pair`, `box`.

### Notes

- No `conversion_factor` / `base_unit` in v1 — keep the model simple. Add later if reporting needs cross-unit math.
- Used by: `products.unit`, `product_pricing_tiers` (display), `product_regional_prices` (display), RFQ (snapshot).

---

## Module 1 — Product Type & Flags

**Approach:** extend the existing `products` collection with new fields. No new collections.

### Fields to add to `products`

All fields go in the **Content tab** (`group: "meta_content"`), in a new `meta_divider_classification` divider section.

| Field | Interface | Type | Placeholder / Choices | Note |
|---|---|---|---|---|
| `product_type` | `select-dropdown` | string | `standard` · `consumable` · `service` · `configurable` | Classifies the product. Drives conditional field visibility and storefront behaviour. |
| `unit` | `select-dropdown-m2o` → `product_units` | uuid | — | Unit of measure shown next to the price and stock (e.g. "$4.50 / kg"). Pulled from the managed units collection. |
| `unit_quantity` | `input` | decimal | `1` | How many units make up one purchasable item. Use `6` for "sold in packs of 6", `0.5` for a half-litre bottle. Defaults to 1. |
| `rfq_enabled` | `boolean` | boolean | — | When enabled, the product price is hidden and a "Request a Quote" button is shown instead. |
| `rfq_min_quantity` | `input` | integer | `1` | Minimum order quantity a customer must request in an RFQ. Leave empty for no minimum. |
| `rfq_lead_time_days` | `input` | integer | `14` | Typical fulfilment lead time in business days, shown to the customer on the product page. |
| `brand` | `select-dropdown-m2o` → `product_brands` | uuid | — | Manufacturer or brand. Used for filtering and storefront branding. |
| `related_products` | `list-m2m` (self-M2M via `products_related`) | alias | — | Cross-sell / related items shown on the product page. |
| `tags` | `list-m2m` → `product_tags` | alias | — | Loose keywords for filtering. Distinct from categories. |

### Conditional / type-driven UI

Use `conditions` on field meta to scope visibility:

- `service` type → hide `unit`, `unit_quantity`, `compare_at_price`, gallery (optional)
- `configurable` type → require at least one variant (frontend check, not DB)
- `consumable` type → no extra visibility rules at product level (reorder lives on variants — see Module 1b)

### Alias O2M / M2M fields linking to other modules

`certifications`, `specs`, `pricing_tiers`, `regional_prices` — each with a clear label and note, placed in the Content tab.

---

## Module 1b — Stock & Reorder (on `product_variants`)

Stock already lives on `product_variants.stock`. Reorder logic belongs there too, not on `products`.

### Fields to add to `product_variants`

| Field | Interface | Type | Note |
|---|---|---|---|
| `low_stock_threshold` | input | integer | When `stock` drops to or below this number, flag this variant as low-stock on storefront and editor. Leave empty to disable. |
| `reorder_point` | input | integer | When `stock` drops below this number, surface a reorder alert (e.g. in a dashboard panel). Leave empty to disable. |
| `reorder_quantity` | input | integer | Suggested quantity to order when restocking this variant. |
| `unit_override` | select-dropdown-m2o → `product_units` (nullable) | uuid | Optional unit override (e.g. parent product sold by `kg`, this variant is a `5kg bag` → `pcs`). Leave empty to inherit from product. |

**Caveat:** products without variants currently have no stock tracking at all. If variant-less stock matters, add `stock`, `low_stock_threshold`, `reorder_point`, `reorder_quantity` to `products` too. **Recommendation for v1:** require a default variant for any product that needs stock; do not duplicate fields on `products`. Document this in the editor handbook.

---

## Module 2 — Brands

### `product_brands` collection

**Meta:** `icon: branding_watermark`, group: `product_catalog`, `display_template: {{translations}}`, `sort_field: sort`, `archive_field: status`

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | draft / published |
| `slug` | extension-wpslug | URL-safe brand identifier (auto-generated from name). |
| `logo` | file-image | Brand logo shown on product pages and brand listings. |
| `website` | input | `https://acme.com` — Public website URL. |
| `translations` | translations | `languageField: "name"`, `display_options.languageField: "name"` |
| system fields | hidden | |

### `product_brands_translations`

Fields: `id`, `product_brands_id` (uuid), `languages_code`, `name` (string, required, note: "Brand display name."), `description` (text, note: "Short brand description shown on the brand landing page.")

---

## Module 3 — Tags

### `product_tags` collection

Lightweight tagging — no full content, just translated names.

**Meta:** `icon: sell`, group: `product_catalog`, `display_template: {{translations}}`, `sort_field: sort`

| Field | Interface | Note |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | draft / published |
| `slug` | extension-wpslug | URL-safe tag identifier. |
| `translations` | translations | `languageField: "name"`, `display_options.languageField: "name"` |
| system fields | hidden | |

### `product_tags_translations`
Fields: `id`, `product_tags_id`, `languages_code`, `name` (required), `description` (optional).

### `products_tags` junction
Hidden, `group: product_tags`. Fields: `id`, `products_id`, `product_tags_id`.

---

## Module 4 — Certifications

### `product_certifications` collection

**Meta:** `icon: verified`, group: `product_catalog`, `display_template: {{translations}}`, `sort_field: sort`, `archive_field: status`, versioning: false

**Tabs:** Content · Details

**Fields:**

| Field | Sort | Group | Interface | Note / Placeholder |
|---|---|---|---|---|
| `id` | 1 | — | input (hidden, readonly) | |
| `sort` | 2 | — | input (hidden) | |
| `meta_header_certifications` | 0 | — | super-header | "Certification • {{translations}}" |
| `status` | 3 | meta_content | select-dropdown | draft / published / archived |
| `certificate_number` | 4 | meta_content | input (monospace) | e.g. `CE-2024-00123` · "Official certificate reference number issued by the certifying body." |
| `issuer` | 5 | meta_content | input | e.g. `TÜV SÜD`, `Bureau Veritas` · "Name of the organisation that issued this certification." |
| `issued_at` | 6 | meta_details | datetime | "Date this certificate was issued." |
| `expires_at` | 7 | meta_details | datetime | "Expiry date. Leave empty if the certification does not expire." |
| `document` | 8 | meta_details | file-image (folder: uploads) | "Upload the official certificate document (PDF or image)." |
| `translations` | 9 | meta_content | translations | `languageField: "name"`, `display_options.languageField: "name"` |
| `meta_tabs` | 18 | — | group-tabs | Content · Details |
| `meta_content` | 1 | meta_tabs | group-raw | Content |
| `meta_details` | 2 | meta_tabs | group-raw | Details |
| `date_created` … `user_updated` | hidden | — | system fields | |

### `product_certifications_translations`
Hidden, `group: product_certifications`, `display_template: {{name}}`

Fields: `id` (int PK), `product_certifications_id` (uuid, hidden), `languages_code` (string, hidden), `name` (string, required, note: "Certification display name, e.g. 'CE Marking', 'RoHS Compliant'"), `description` (text, note: "What this certification means for the product and why it matters.")

### `products_certifications` junction
Hidden, `group: product_certifications`

Fields: `id` (int PK), `products_id` (uuid, hidden), `product_certifications_id` (uuid, hidden), `obtained_at` (date, note: "When this specific product obtained this certification.")

### Alias on `products`
`certifications` — `special: ["m2m"]`, interface: `list-m2m`, `display_template: {{translations}}`, note: "Industry and compliance certifications that apply to this product."

### Relations
- `products_certifications.products_id → products` (`one_field: "certifications"`, `junction_field: "product_certifications_id"`, CASCADE, `one_deselect_action: "delete"`)
- `products_certifications.product_certifications_id → product_certifications` (CASCADE, `one_deselect_action: "nullify"`)

---

## Module 5 — Spec Groups & Specifications

### `product_spec_groups` collection

**Meta:** `icon: category`, group: `product_catalog`, `display_template: {{translations}}`, `sort_field: sort`

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `meta_header_spec_groups` | super-header | "Spec Group • {{translations}}" |
| `status` | select-dropdown | draft / published |
| `icon` | input | Material Symbols icon name displayed next to the group heading, e.g. `bolt`, `straighten`, `wifi`. |
| `translations` | translations | `languageField: "name"`, `display_options.languageField: "name"` |
| system fields | hidden | |

### `product_spec_groups_translations`
Hidden, `group: product_spec_groups`, `display_template: {{name}}`

Fields: `id`, `product_spec_groups_id` (uuid), `languages_code`, `name` (string, required, placeholder: `e.g. Electrical, Physical Dimensions, Connectivity`, note: "Group heading shown above the specification rows."), `note` (text, note: "Optional sub-heading or context shown below the group title.")

---

### `product_specs` collection

Individual spec line, owned by a product. `display_template: {{translations}}`, `sort_field: sort`, group: `products`, hidden: true

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | draft / published |
| `product` | select-dropdown-m2o (hidden) | Parent product. |
| `group` | select-dropdown-m2o | Spec group for organising rows under a heading. Leave empty to show ungrouped. |
| `unit` | select-dropdown-m2o → `product_units` (nullable) | Optional unit shown next to the value (e.g. `V`, `mm`). Overrides the freetext `unit` in translations when set. |
| `display_type` | select-radio | `text` · `boolean` · `number` · `range` · `list` — controls how the value is rendered on the product page. |
| `translations` | translations | `languageField: "label"`, `display_options.languageField: "label"` |
| system fields | hidden | |

### `product_specs_translations`
Hidden, `group: product_specs`, `display_template: {{label}}`

Fields: `id`, `product_specs_id` (uuid), `languages_code`, `label` (string, required, placeholder: `e.g. Operating Voltage, Weight, Interface`, note: "The specification attribute name shown in the left column."), `value` (text, required, placeholder: `e.g. 12V DC, 250g, USB-C 3.2 Gen 2`, note: "The specification value shown in the right column."), `note` (text, note: "Optional footnote or clarification shown below the spec row.")

### Alias on `products`
`specs` — O2M, interface: `list-o2m`, `template: {{translations}} — {{group.translations}}`, note: "Technical specifications grouped under spec groups. Each row is one property of the product."

### Relations
- `product_specs.product → products` (`one_field: "specs"`, `sort_field: "sort"`, CASCADE, `one_deselect_action: "delete"`)
- `product_specs.group → product_spec_groups` (SET NULL)
- `product_specs.unit → product_units` (SET NULL)
- Translations: standard two-relation pattern

---

## Module 6 — Pricing Tiers

### `product_pricing_tiers` collection

`display_template: {{label}}`, `sort_field: sort`, group: `products`, hidden: true

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | draft / published |
| `product` | select-dropdown-m2o (hidden) | Parent product. Required. |
| `variant` | select-dropdown-m2o → `product_variants` (nullable) | Optional — limits this tier to a specific variant. Leave empty to apply to all variants of the product. |
| `label` | input (monospace) | `e.g. Wholesale 10+, Distributor Price, Standard` — Internal reference name. Not shown to customers. |
| `min_quantity` | input (iconLeft: `remove`) | `1` — Minimum quantity for this tier to apply. Use 1 for a tier that always applies. |
| `max_quantity` | input (iconLeft: `add`) | Leave empty for no upper limit. |
| `price` | input (iconLeft: `attach_money`) | Unit price at this quantity tier. |
| `customer_group` | select-dropdown-m2o → `customer_groups` (nullable) | Limits this tier to a customer segment. Leave empty to apply to all customers. |
| `note` | input-multiline | Customer-visible explanation, e.g. "Price applies when ordering 10 or more units." |
| system fields | hidden | |

### Resolution logic (documented in `price.ts`)
Given product P, optional variant V, quantity Q, optional group G:
1. Filter published tiers where `product = P`
2. Further filter where `variant = V` OR `variant IS NULL`
3. Further filter where `min_quantity ≤ Q` and (`max_quantity ≥ Q` or `max_quantity IS NULL`)
4. Further filter where `customer_group = G` or `customer_group IS NULL`
5. Sort: variant-specific before product-wide, then group-specific before group-null, then highest `min_quantity` first
6. Pick the first match; fall back to `variant.price` → `product.price`

### Alias on `products`
`pricing_tiers` — O2M, note: "Volume and segment-specific price rules. The most specific matching tier overrides the base price."

### Relations
- `product_pricing_tiers.product → products` (`one_field: "pricing_tiers"`, `sort_field: "sort"`, CASCADE, `one_deselect_action: "delete"`)
- `product_pricing_tiers.variant → product_variants` (SET NULL)
- `product_pricing_tiers.customer_group → customer_groups` (SET NULL)

---

## Module 7 — Customer Groups

### `customer_groups` collection

**Meta:** `icon: groups`, group: `product_catalog`, `display_template: {{translations}}`, `sort_field: sort`

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `sort` | hidden integer | |
| `status` | select-dropdown | draft / published |
| `code` | input (monospace) | `wholesale`, `distributor`, `retail` — Stable identifier used in code and pricing tier logic. |
| `default_discount_pct` | input | `0` — Optional flat discount applied to base price when no tier matches. Use whole numbers (5 = 5%). |
| `translations` | translations | `languageField: "name"` |
| system fields | hidden | |

### `customer_groups_translations`
Fields: `id`, `customer_groups_id`, `languages_code`, `name` (required, "Wholesale buyers", "Distributors"), `description` (optional).

**Seed:** `retail`, `wholesale`, `distributor`.

---

## Module 8 — Regional Pricing

### `product_regions` collection

`display_template: {{name}} ({{currency}})`, group: `product_catalog`

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `status` | select-dropdown | draft / published |
| `code` | input (monospace) | `eu`, `apac`, `mena`, `us` — Short identifier used in code and URL hints. |
| `name` | input | `European Union`, `Asia-Pacific` — Human-readable region name. |
| `currency` | input (monospace) | `EUR`, `USD`, `GBP` — ISO 4217 currency code applied to all prices in this region. |
| `countries` | json (inline-repeater) | Array of ISO 3166-1 alpha-2 country codes covered by this region. Used for automatic region detection. |
| system fields | hidden | |

### `product_regional_prices` collection

`display_template: {{region.name}}`, group: `products`, hidden: true

**Fields:**

| Field | Interface | Note / Placeholder |
|---|---|---|
| `id` | hidden UUID | |
| `status` | select-dropdown | draft / published |
| `product` | select-dropdown-m2o (hidden) | Parent product. Required. |
| `variant` | select-dropdown-m2o → `product_variants` (nullable) | Optional — limits this regional price to a specific variant. Leave empty to apply to all variants. |
| `region` | select-dropdown-m2o | The region this price applies to. |
| `price` | input (iconLeft: `attach_money`) | Regional base price in the region's currency. |
| `compare_at_price` | input (iconLeft: `attach_money`) | Crossed-out original price for sale display in this region. |
| system fields | hidden | |

### Alias on `products`
`regional_prices` — O2M, note: "Override base price per region. Currency is inherited from the region's currency setting."

### Relations
- `product_regional_prices.product → products` (`one_field: "regional_prices"`, CASCADE)
- `product_regional_prices.variant → product_variants` (SET NULL)
- `product_regional_prices.region → product_regions` (SET NULL)

### Regional detection (frontend)
Priority order: (1) user-set cookie `preferred_region`, (2) `Accept-Language` header → match to region countries, (3) fall back to base `products.price` with `globals.default_currency`.

---

## Module 9 — RFQ (Request for Quote)

### Configuration fields on `products` (from Module 1)
`rfq_enabled`, `rfq_min_quantity`, `rfq_lead_time_days` — already defined.

### `product_rfq_requests` collection

`display_template: {{contact_name}} — {{product.translations}}`, `archive_field: status`, `archive_value: rejected`, group: `product_catalog`, **not hidden** (staff need to review these)

**Tabs:** Request · Quote · Internal

| Field | Group | Interface | Note / Placeholder |
|---|---|---|---|
| `id` | hidden | UUID | |
| `meta_header_rfq` | — | super-header | "RFQ from {{contact_name}} • {{company_name}}" |
| `status` | request | select-dropdown | `pending` · `reviewing` · `quoted` · `accepted` · `rejected` · `expired` |
| `product` | request | select-dropdown-m2o | Product the customer is enquiring about. |
| `variant` | request | select-dropdown-m2o (nullable) | Specific variant if applicable. |
| `requested_sku` | request | input (monospace, readonly) | Denormalized SKU snapshot at submission time. Survives variant/product deletion. |
| `quantity` | request | input (iconLeft: `inventory`) | `100` — Requested order quantity. |
| `unit` | request | select-dropdown-m2o → `product_units` (nullable) | Unit context (snapshot from product at submission time). |
| `target_price` | request | input (iconLeft: `attach_money`) | Customer's target unit price. Leave empty if not specified. |
| `customer_group` | request | select-dropdown-m2o → `customer_groups` (nullable) | Segment of the requesting customer, if known. |
| `message` | request | input-rich-text-html | Full requirements, special conditions, or questions from the customer. |
| `company_name` | request | input | `Acme GmbH` |
| `contact_name` | request | input | `Jane Smith` |
| `contact_email` | request | input | `jane@acme.com` |
| `contact_phone` | request | input | `+49 30 1234567` |
| `quoted_price` | quote | input (iconLeft: `attach_money`) | Unit price quoted back to the customer. Filled after internal review. |
| `quote_valid_until` | quote | datetime | Expiry date of this quotation. |
| `quote_message` | quote | input-rich-text-html | Response message sent to the customer with the quote. |
| `internal_notes` | internal | input-multiline | Internal comments, not visible to the customer. |
| system fields | hidden | — | |
| `meta_tabs` | — | group-tabs | Request · Quote · Internal |
| `meta_request`, `meta_quote`, `meta_internal` | meta_tabs | group-raw | |

### Relations
- `product_rfq_requests.product → products` (SET NULL — preserve requests if product is deleted)
- `product_rfq_requests.variant → product_variants` (SET NULL)
- `product_rfq_requests.unit → product_units` (SET NULL)
- `product_rfq_requests.customer_group → customer_groups` (SET NULL)
- system field relations to directus_users

### Directus Flow: RFQ Notification
A `manual` or `event` (items.create on `product_rfq_requests`) flow that:
1. Gets globals (for directus_url)
2. Reads the product and submitter details
3. Sends email to the sales team notifying of a new RFQ

---

## Changes to Existing Collections

### `products` — new fields

| Field | Module | Notes |
|---|---|---|
| `product_type` | 1 | select-dropdown |
| `unit` | 1 | m2o → `product_units` |
| `unit_quantity` | 1 | decimal, default 1 |
| `rfq_enabled` | 1 | boolean |
| `rfq_min_quantity` | 1 | integer |
| `rfq_lead_time_days` | 1 | integer |
| `brand` | 1 | m2o → `product_brands` |
| `tags` | 3 | M2M alias via `products_tags` |
| `related_products` | 1 | self-M2M alias via `products_related` |
| `certifications` | 4 | M2M alias via `products_certifications` |
| `specs` | 5 | O2M alias on `product_specs.product` |
| `pricing_tiers` | 6 | O2M alias on `product_pricing_tiers.product` |
| `regional_prices` | 8 | O2M alias on `product_regional_prices.product` |

Reorganise the Content tab with a new `meta_divider_classification` divider grouping the type / unit / brand fields together. Place the RFQ fields under a separate `meta_divider_rfq` divider with conditions on `rfq_enabled`.

### `product_variants` — new fields

| Field | Module | Notes |
|---|---|---|
| `low_stock_threshold` | 1b | integer, nullable |
| `reorder_point` | 1b | integer, nullable |
| `reorder_quantity` | 1b | integer, nullable |
| `unit_override` | 1b | m2o → `product_units`, nullable |

### `globals` — new field

| Field | Module | Notes |
|---|---|---|
| `default_currency` | 8 | string (monospace), `USD` default. Used by `formatPrice()` when no region matches. |

### `products_related` (new junction, self-M2M)

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `products_id` | uuid | The owning product. |
| `related_products_id` | uuid | The related product. |
| `sort` | int | Display order on the product page. |

Two relations: both FKs to `products` with `one_field: "related_products"` on the owning side only.

---

## Summary — New Collections (15)

| Collection | Visible | Group |
|---|---|---|
| `product_units` | ✓ | product_catalog |
| `product_units_translations` | hidden | product_units |
| `product_brands` | ✓ | product_catalog |
| `product_brands_translations` | hidden | product_brands |
| `product_tags` | ✓ | product_catalog |
| `product_tags_translations` | hidden | product_tags |
| `products_tags` | hidden | product_tags |
| `product_certifications` | ✓ | product_catalog |
| `product_certifications_translations` | hidden | product_certifications |
| `products_certifications` | hidden | product_certifications |
| `product_spec_groups` | ✓ | product_catalog |
| `product_spec_groups_translations` | hidden | product_spec_groups |
| `product_specs` | hidden | products |
| `product_specs_translations` | hidden | product_specs |
| `product_pricing_tiers` | hidden | products |
| `customer_groups` | ✓ | product_catalog |
| `customer_groups_translations` | hidden | customer_groups |
| `product_regions` | ✓ | product_catalog |
| `product_regional_prices` | hidden | products |
| `product_rfq_requests` | ✓ | product_catalog |
| `products_related` | hidden | products |

(21 tables total including junctions and translations.)

---

## Frontend Impact

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `ProductUnit`, `ProductBrand`, `ProductTag`, `ProductCertification`, `ProductSpecGroup`, `ProductSpec`, `ProductPricingTier`, `CustomerGroup`, `ProductRegion`, `ProductRegionalPrice`, `ProductRfqRequest`; extend `Product` and `ProductVariant` |
| `src/lib/api.ts` | Extend `fetchProductBySlug` fields, add `fetchRegions()`, `fetchUnits()`, `fetchBrands()` |
| `src/lib/price.ts` | Add `resolveTierPrice(tiers, variant, qty, group?)`, `resolveRegionalPrice(product, variant, regionCode)`, `formatUnit(unit, locale)` |
| `src/lib/units.ts` (new) | Pluralization + abbreviation helpers using `product_units_translations` |
| `ProductDetail.astro` | Conditionally render specs, certs, pricing table, RFQ form; hide price when `rfq_enabled`; render `unit.symbol` next to prices |
| New: `ProductSpecs.astro` | Grouped spec table with `display_type` rendering |
| New: `ProductCertifications.astro` | Certification badge list with document links |
| New: `ProductPricingTable.astro` | Volume tier table |
| New: `ProductRFQForm.astro` | Quote request form, POSTs to `product_rfq_requests` via Directus API |
| New: `ProductBrandBadge.astro` | Brand logo + link |
| New: `ProductTags.astro` | Tag chip list |

---

## Implementation Order

1. **Module 0** — Units of Measure (foundation; everything else references it)
2. **`globals.default_currency`** — one-field addition; unblocks regional pricing math
3. **Module 1** — Product type, unit, RFQ flags, brand/tags/related aliases on `products`
4. **Module 1b** — Stock & reorder fields on `product_variants`
5. **Module 2** — Brands
6. **Module 3** — Tags
7. **Module 5** — Spec groups + specs (highest UX impact)
8. **Module 4** — Certifications
9. **Module 7** — Customer Groups (before pricing tiers so the FK is available)
10. **Module 6** — Pricing tiers
11. **Module 8** — Regions + regional prices
12. **Module 9** — RFQ requests + notification flow

---

## Open Questions for Review

1. **Variant-less stock** — accept the "use a default variant for stock-tracked products" rule, or duplicate `stock` / `reorder_*` on `products` too?
2. **Unit conversion** — add `base_unit` + `conversion_factor` to `product_units` now, or defer until reporting needs it?
3. **Regional detection UX** — auto-detect silently, show a region switcher, or both (auto + visible override)?
4. **RFQ submission method** — direct `POST` to Directus `/items/product_rfq_requests` via the public SDK (requires granting public create permission) or proxied through an Astro API endpoint for rate-limiting and validation?
5. **`product_attributes` (faceted filtering)** — variant `options` is freeform JSON, fine for editing but bad for catalog-wide filters. Add a structured attributes collection now, or defer until storefront filtering is in scope?
6. **`product_inventory_movements`** — defer to a future milestone (after `reorder_point` proves out), or include now?

---

## Status

**Audit performed against live schema — this entire plan is essentially shipped.**

- [x] Plan reviewed & approved
- [x] Module 0 — units of measure (`product_units` + translations)
- [x] `globals.default_currency`
- [x] Module 1 — `product_type`, `unit`, `unit_quantity`, `rfq_enabled`, `rfq_min_quantity`, `rfq_lead_time_days`, `brand`, `tags`, `related_products`, `eclass_code`, `eclass_version` on `products`
- [x] Module 1b — `product_variants`: `low_stock_threshold`, `reorder_point`, `reorder_quantity`, `unit_override`
- [x] Module 2 — brands (`product_brands` + translations)
- [x] Module 3 — tags (`product_tags` + translations + `products_tags` junction)
- [x] Module 4 — certifications (`product_certifications`, translations, `products_certifications` junction)
- [x] Module 5 — spec groups & specs (`product_spec_groups`, `product_specs`, translations, plus `product_spec_variant_values` for variant comparison)
- [x] Module 6 — pricing tiers (`product_pricing_tiers`)
- [x] Module 7 — customer groups (`customer_groups` + translations)
- [x] Module 8 — product regions & regional prices (`product_regions`, `product_regional_prices`)
- [x] Module 9 — RFQ requests collection (`product_rfq_requests`)
- [x] Frontend — extended `types.ts`, `api.ts`, `price.ts`
- [x] Frontend — extended `ProductDetail.astro` + new sub-components (`ProductSpecs`, `ProductCertifications`, `ProductPricingTable`, `ProductBrandBadge`, `ProductTags`, `ProductGallery`)

**Remaining work (non-blocking):**

- [ ] RFQ Directus Flow: email notification on new `product_rfq_requests` item creation
- [ ] `ProductRFQForm.astro` storefront form (POST to Directus) — Open Question #4 still to resolve
- [ ] `units.ts` pluralization helper (current rendering uses `unit.symbol` only — fine for now)
- [ ] Open Questions #1, #2, #5 (variant-less stock policy, unit conversion fields, `product_attributes` for faceted filtering) — defer until needed
