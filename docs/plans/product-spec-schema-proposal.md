# Product Spec Schema — Proposed Structure

Spec model (groups → specs → per-variant values) editable from **both** the
Product and the Variant interface, tuned for what the **Directus admin panel**
does natively — not an ideal custom UI we don't control.

## Directus realities that drive the design

- **No grid/matrix editor.** The specs × variants matrix is edited as nested
  lists from either side, never as a spreadsheet.
- **Relational M2O gives a real picker; JSON does not.** A variant-value row
  gives a proper variant/spec dropdown; a JSON repeater would force typing ids.
  → variant values stay **relational**.
- **Inline-create on M2O.** The `+` beside a dropdown creates the related row
  (group, spec) without leaving the current item.
- **Nested O2M edits inline** → values entered in full context.
- **Nested inline-create can't pass parent context down.** A spec is owned by a
  *product*; creating one from inside a *variant* can't natively know which
  product. → resolved by one Flow + one nullable column (below). This single
  fact is what shapes the whole variant-side design.

## The data is one matrix, two doors

```
            variant BD400T   variant BD800T   ← columns (product's variants)
spec rows ┌────────────────┬────────────────┐
Voltage   │ 230 (base)     │ 240 (override) │  ← cells = product_spec_variant_values
Weight    │ 4200           │ 4500           │
└─ group, label, unit, irdi (the row definition, owned by the product)
```

Directus already exposes the cells from **both** ends:
- **Product door:** product → spec → its variant cells (`product_specs.spec_variant_values`)
- **Variant door:** variant → its cells across specs (`product_variants.specs`)

So the schema is **already symmetric**. The job is making *both* doors fully
usable — including creating spec rows **and** groups from the variant — without
duplicating any metadata (one canonical spec definition, always).

## Collections (same shape, two small changes)

| Collection | Role | Key fields |
|---|---|---|
| `product_spec_groups` (+ `_translations`) | Section taxonomy (Electrical, Dimensions…), eClass-alignable | `is_global bool`, `icon`, `irdi`, `status` |
| `product_specs` (+ `_translations`) | Row definition + base value. Single source of truth for a spec | `product` *(now nullable)*, `group`, `unit`, `display_type`, `irdi` |
| `product_spec_variant_values` | Per-variant **value override only** (no metadata) | `spec`, `variant`, `value` |

**Change 1 — `product_specs.product` becomes nullable.** Lets a spec be
inline-created from the variant drawer (where the product can't be filled in the
moment); the Flow below backfills it on save.

**Change 2 — groups become product-agnostic.** Drop the single `product`
scoping column; add `is_global` (+ optional `products_spec_groups` M2M to scope a
group to a defined subset of products). This makes selecting/creating a group
**identical from either door** — no product to infer for groups at all. This is
the same grouping upgrade discussed earlier, now also required to make the
variant door clean.

## One Flow (the enabler)

**Event:** `product_spec_variant_values` create/update.
**Action:** if the linked `spec.product` is empty, set it to `variant.product`.

A spec inline-created from a variant can't inherit the product natively; this
Flow backfills it the instant the variant value is saved. Legit use — it fills a
genuinely un-inferable value. It is **not** the "sync duplicated metadata" Flow
rejected earlier: there's still one canonical spec, nothing is copied.

## Editing — Door 1: Product (unchanged)

Scroll to **Specs** on the product → inline list. **+ Create New** opens a spec
drawer (group + label + value + unit + display_type), with a nested
**Per-variant values** list. Group's `[+]` inline-creates a group. One drawer,
one save.

## Editing — Door 2: Variant (the new requirement)

Open a variant; its **Specs** section is now a real entry surface:

```
BD800T variant
Specs                                   [+ Add spec]
┌──────────────────────────────────────────────────┐
│ Electrical · Voltage ............... [ 240 ]   ✎ │
│ Electrical · Power Output .......... [ 90  ]   ✎ │
│ Dimensions · Net Weight ............ [ 4500 ]  ✎ │
└──────────────────────────────────────────────────┘
```

- `display_template` on the `spec` M2O → `{{spec.group.name}} · {{spec.label}}`
  so rows show grouped, labeled context (not a bare value list).
- `spec` dropdown filtered to this product's specs (+ unassigned).
- **+ Add spec** → inline-create a spec (and, via its group `[+]`, a group),
  type *this variant's* value; the Flow sets the spec's product on save.

Result: the admin can build the entire group → spec → value structure from the
variant, exactly like from the product. Both doors write to the same rows —
edit a spec's label once and it's correct on every variant.

## Walkthrough — building a spec from the variant

1. Open variant **BD800T** → **Specs** → **+ Add spec**.
2. Spec drawer: Group dropdown → no "Hydraulics" yet → hit **[+]**, type
   "Hydraulics", save. (Groups are product-agnostic now — nothing else to fill.)
3. Fill Label "Flow Rate", Unit "L/min", Display type "number".
4. In the same drawer, the **value** field is this variant's value → "120".
5. Save. The Flow sets the new spec's `product` = BD800T's product. The row now
   exists for the whole product; open **BD400T** and "Hydraulics · Flow Rate"
   is there too, ready for its own value.

## Why this fits the requirement

| Need | How it's met |
|---|---|
| Set up specs from the variant interface | `product_variants.specs` made a real entry surface (display_template + filter + inline-create) |
| Set up **groups** from the variant too | Groups are product-agnostic → group `[+]` works from inside the variant's spec drawer |
| New spec from a variant knows its product | Flow backfills `spec.product` from `variant.product` |
| No duplicated/desynced metadata | One canonical `product_specs` row; both doors edit the same rows |
| Keep eClass / translations / scalability | IRDI stays an indexed column; translations stay relational |

## Migration

1. Make `product_specs.product` nullable.
2. Groups: add `is_global` (existing global/`null`-scoped groups → `true`);
   create `products_spec_groups` M2M; for each old `product`-scoped group, link
   it to that product + set `is_global = false`; then drop
   `product_spec_groups.product`.
3. Build the Flow (`product_spec_variant_values` create/update → backfill
   `spec.product`).
4. Variant `specs` field: add `display_template`, dropdown filter, enable
   inline-create.
5. Frontend: group by `group` (global or linked); variant values still read
   from `product_spec_variant_values` — no render change.
