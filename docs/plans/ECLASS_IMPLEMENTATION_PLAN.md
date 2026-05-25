# eCl@ss Classification — Implementation Plan

## What is eCl@ss?

eCl@ss is an international B2B product classification and description standard. Each product (and category) is assigned an **8-digit commodity code** (e.g. `32163200`) at a specific **version** (e.g. `12.0`). Individual spec fields can be linked to standardised property definitions via their **IRDI** (International Registration Data Identifier, e.g. `0173-1#02-AAO677#002`).

**4-level code hierarchy:**
```
Segment     → 32           (Electronic components & supplies)
Main Group  → 32-16        (Acoustic components)
Group       → 32-16-32     (Headphones, earphones)
Commodity   → 32-16-32-00  (Wireless earphones)
```

**Benefits of adding this to the catalog:**
- B2B buyers can identify and filter products by standardised class
- Spec fields map to internationally agreed property definitions (IRDI)
- Foundation for future B2B data exchange (BMEcat, EDI, procurement systems)

**Scope: Standard** — eCl@ss code + version on categories and products, IRDI on spec groups and specs, badge UI on product/category pages, IRDI tooltip on spec labels.  
**Data entry: Manual** in Directus admin (editors type the code/IRDI directly).

---

## Phase A — Directus Schema

Use `mcp__barkomas_dev__fields` (create) for each field below.

### A1. `product_categories` — 2 new fields

| Field | Type | Interface | Required | Note |
|---|---|---|---|---|
| `eclass_code` | string | input | No | 8-digit code e.g. `32163200` |
| `eclass_version` | string | input | No | e.g. `12.0` |

### A2. `products` — 2 new fields

| Field | Type | Interface | Required | Note |
|---|---|---|---|---|
| `eclass_code` | string | input | No | Product-level code; overrides category code when set |
| `eclass_version` | string | input | No | Product-level version; overrides category version when set |

### A3. `product_spec_groups` — 1 new field

| Field | Type | Interface | Required | Note |
|---|---|---|---|---|
| `irdi` | string | input | No | IRDI of the eCl@ss property block / aspect group |

### A4. `product_specs` — 2 new fields

| Field | Type | Interface | Required | Note |
|---|---|---|---|---|
| `irdi` | string | input | No | IRDI of the individual eCl@ss property definition |
| `eclass_preferred_name` | string | input | No | Official English property name (denormalised reference from eCl@ss release) |

> No new relations or collections needed. All fields are plain strings on existing collections.

---

## Phase B — TypeScript Types & API (`frontend/src/lib/`)

### B1. `types.ts` — extend 4 existing types

**ProductCategory** — add:
```ts
eclass_code: string | null;
eclass_version: string | null;
```

**Product** — add:
```ts
eclass_code: string | null;
eclass_version: string | null;
```

**ProductSpecGroup** — add:
```ts
irdi: string | null;
```

**ProductSpec** — add:
```ts
irdi: string | null;
eclass_preferred_name: string | null;
```

### B2. `api.ts` — add new fields to 3 fetch functions

- `fetchAllCategories()` → add `"eclass_code"`, `"eclass_version"` to fields array
- `fetchCategoryById()` → add same
- `fetchProductBySlug()`:
  - product root fields → add `"eclass_code"`, `"eclass_version"`
  - specs fields → add `"specs.irdi"`, `"specs.eclass_preferred_name"`
  - spec group fields → add `"specs.group.irdi"`

---

## Phase C — `catalog.ts` utility

Add `resolveEclassCode()` helper function:

```ts
/**
 * Returns the effective eCl@ss code for a product.
 * Product-level code takes precedence over category-level.
 */
export function resolveEclassCode(
  product: Pick<Product, "eclass_code" | "eclass_version">,
  category: Pick<ProductCategory, "eclass_code" | "eclass_version"> | null,
): { code: string; version: string } | null {
  const code = product.eclass_code ?? category?.eclass_code ?? null;
  const version = product.eclass_version ?? category?.eclass_version ?? null;
  return code ? { code, version: version ?? "" } : null;
}
```

---

## Phase D — Frontend Components

### D1. New `EclassBadge.astro`
**Path:** `frontend/src/components/EclassBadge.astro`

**Props:**
```ts
interface Props {
  code: string;       // 8-digit e.g. "32163200"
  version: string;    // e.g. "12.0"
  class?: string;     // optional extra Tailwind classes
}
```

**Renders:**
```
eCl@ss  32-16-32-00  v12.0  ↗
```
- Code auto-formatted as `XX-XX-XX-XX` (insert `-` every 2 chars)
- `v12.0` version pill beside the code
- Entire badge is a link to eCl@ss search (opens in `_blank`)
- Styling: small pill, `bg-slate-100 text-slate-600`, fits inline with ProductBrandBadge

### D2. `ProductDetail.astro` — add eCl@ss badge in header
**File:** `frontend/src/components/ProductDetail.astro`

In frontmatter:
```ts
import { resolveEclassCode } from "../lib/catalog";
const eclassInfo = resolveEclassCode(product, product.category ?? null);
```

In template — after brand badge row, before price row:
```astro
{eclassInfo && (
  <EclassBadge code={eclassInfo.code} version={eclassInfo.version} />
)}
```

### D3. `CategoryLanding.astro` — add eCl@ss badge in category header
**File:** `frontend/src/components/CategoryLanding.astro`

In template — below category name, only when `category.eclass_code` is set:
```astro
{category.eclass_code && (
  <EclassBadge code={category.eclass_code} version={category.eclass_version ?? ""} />
)}
```

### D4. `ProductSpecs.astro` — add IRDI tooltips (non-visual)
**File:** `frontend/src/components/ProductSpecs.astro`

- On each `<dt>` spec label: add `title={spec.irdi ?? undefined}`
- On each group header element: add `title={group.irdi ?? undefined}`
- No visual change — IRDI only surfaces on hover as the native browser tooltip

---

## File Change Summary

| File | Change |
|---|---|
| Directus (via MCP) | Add fields to 4 collections (`product_categories`, `products`, `product_spec_groups`, `product_specs`) |
| `src/lib/types.ts` | Extend 4 types with new nullable fields |
| `src/lib/api.ts` | Add new fields to `fetchAllCategories`, `fetchCategoryById`, `fetchProductBySlug` |
| `src/lib/catalog.ts` | Add `resolveEclassCode()` helper |
| `src/components/EclassBadge.astro` | **New** — badge component |
| `src/components/ProductDetail.astro` | Render badge in header area |
| `src/components/CategoryLanding.astro` | Render badge below category name |
| `src/components/ProductSpecs.astro` | Add IRDI `title` tooltip on spec labels and group headers |

---

## Verification

1. After MCP schema work: `mcp__barkomas_dev__fields` list on each modified collection to confirm all fields exist
2. Enter test data in Directus:
   - "Electronics" category → `eclass_code: 32163200`, `eclass_version: 12.0`
   - One spec group → `irdi: 0173-1#01-AGA327#001`
   - One spec → `irdi: 0173-1#02-AAO677#002`, `eclass_preferred_name: Bluetooth version`
3. `npm run build` from `frontend/` — zero errors, page count unchanged
4. `npm run dev` → open category page → verify `32-16-32-00 v12.0` badge appears below category name
5. Open product detail → verify badge in header, IRDI tooltip appears on spec label hover
