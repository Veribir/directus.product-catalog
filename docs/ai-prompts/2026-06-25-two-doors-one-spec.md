# Episode: "Two Doors, One Spec"

**Spans:** 2026-06-24 → 2026-06-25
**Setting:** Barkomas's Directus product catalog has a textbook-normalized spec model — groups, specs, per-variant override values — but editors find it exhausting to use. Over two sessions, that complaint gets argued down through four rejected fixes before landing on the one that actually respects what Directus can and can't do.

---

## ACT I — Patching the Map

*Routine housekeeping opens the episode: the user notices `docs/product-catalog-schema-guide.md` has drifted from the live Directus schema and asks for the SQL file to be reconciled via MCP. Claude finds a `product` FK on `product_spec_groups` that exists live but is missing from the SQL, adds it, then does the same pass over the whole `products` collection. Nothing dramatic — except this is the exact field the rest of the episode will spend two days arguing about.*

---

## ACT II — The Confusing Flow

**USER:** now we have a requirement to simplify the product spec proces.. if i want to add/edit product spec from product page, i can add/open spec group first, then i add a new spec from there, then i have to add variant wise spec value... i know that from programmer perspective, the schema design is fine. but from user perspective, the ux flow is a bit confusing.. it's even more confusing to add/edit specs from product variant interface in directus, there only shows variant value and specs. without spec groups, it becomes unmanageble which is also hard to understand...
you have any idea to restructure it in better schema + ux approach?

**CLAUDE:** Two different fixes here: (1) a cheap config-only fix — `display_template` on the variant-value list so it reads "Electrical: Voltage" instead of a bare value, and (2) a bigger lift — a custom Directus interface extension rendering the whole spec matrix as one spreadsheet. Option 2 solves it at the root but is real engineering work; I'd keep the underlying tables as-is since that relational shape is correct for eCl@ss mapping and comparison tables — the problem is presentation, not data model.

**USER:** there is no way, we can shape the schema to match our requirement? think deeply

**CLAUDE:** Yes — the friction is two normalization decisions stacked on top of each other.
1. **Flatten `product_spec_variant_values` into JSON on `product_specs`**, mirroring how `product_variants.options` already works — one drawer, one save, no second collection.
2. **Split ad hoc grouping from shared/eClass grouping.** `product_spec_groups` is doing two jobs at once — a one-off heading and a real shared taxonomy — which is why the group dropdown shows both "unfiltered." Add a plain `group_label` string for the ad hoc case; keep the relational table only for groups that are genuinely shared.

*Claude writes `docs/plans/product-spec-schema-restructure.md` — five options (A: UX-only, B: flatten to JSON, C: split grouping, D: B+C combined, E: collapse everything into one JSON blob) with pros, cons, and migration cost for each. No schema touched yet.*

---

## ACT III — Three Pitches, Three Rejections

*The next morning, the user comes back with their own ideas — three in a row. Each gets taken seriously and each gets argued down on its merits, not dismissed.*

**USER:** how about we have full spec flow for both product and product variant... i mean we will have product_spec_groups table and also product_variant_spec_groups, and similarly for specs tables.. schema would be quite same for both, these are just for overriding purpose.. what do you say?

**CLAUDE:** I'd push back — this makes the problem worse. A spec isn't just a value, it's a value plus metadata (group, unit, display type, IRDI, label). Mirroring the whole table means overriding *one value* requires recreating *all* of that metadata on the variant side too — heavier than today, not lighter. And it creates drift: rename "Voltage" to "Operating Voltage" on the base spec and every variant-level duplicate silently falls out of sync, with no FK forcing the connection. It also roughly doubles the collection count, which fights the simplification goal directly.

**USER:** how about we setup a directus flow to sync the updates?

**CLAUDE:** A flow can keep things *technically* in sync, but it's automating a patch over a problem an FK already solves for free. You'd need four-plus flows — propagate metadata changes without touching `value`, cascade deletes, decide whether to seed every variant with every spec just so there's something to override (which puts you right back in a dense N×M matrix). A flow is the right tool for propagating *real* changes, the wrong tool for avoiding duplication that shouldn't exist in the first place.

**USER:** i have another idea.. how about we set many-to-many relation with product and product_spec_groups.

**CLAUDE:** This one's actually good — but it solves a different slice of the problem than the one you raised. Today a group is either scoped to exactly one product or fully global with no in-between; M2M lets a group be shared across a *defined subset* of products (e.g. "Engine Specs" across one model range) without polluting every other product's dropdown. It doesn't reduce the steps to add a spec, and it doesn't touch the variant-override friction — but pure M2M also can't express "truly global" without linking to every product, so it'd need an `is_global` escape-hatch flag alongside it. Worth folding in as the refined version of the grouping fix, not a replacement for it.

---

## ACT IV — Bound to the Panel

**USER:** okay.. you just propose the industry standard solution of this kind product specs schema structure for optimized and scalable solution. but keep in mind that we are implementing on directus, so we can't follow the typical backend system dev perspective. we can't design ui interface of admin panel as our own need, we are bound to directus panel. so we must ensure best ux experience in directus panel..
write down your proposal in a .md file explaining the full structure. don't over-explain, long essay are boring to read

**CLAUDE:** The key reframing for Directus: the spec × variant matrix can only be edited from one side at a time — Directus has no grid editor — so pick the spec side as the single source of truth. And critically, a relational variant-value table gives a real variant *picker* in Directus; a JSON repeater would force typing a variant id as free text. The usual "flatten to JSON" advice is actually wrong *for Directus specifically*.

*Writes `docs/plans/product-spec-schema-proposal.md`. The user asks for a concrete walkthrough — Claude adds ASCII-sketched panel mockups of the BD400T product: opening the Specs drawer, hitting `[+]` to inline-create a group, adding per-variant override rows. "One drawer, one save, context the entire time."*

**USER:** see mcp, i think your proposal structure is already implemented in our barkomas directus

**CLAUDE:** You're right, and I should be straight about it. *(Checks the live schema rather than assuming.)* Confirmed — the core editing model is already built: specs edited inline on the product, group as an M2O with inline-create, variant values kept relational and nested under each spec. My doc largely re-derived the existing schema. The one genuinely missing piece is schema-level (the M2M + `is_global` grouping upgrade); the rest is three small interface config tweaks. You don't need a migration — you need a small delta.

**USER:** we had a requirement that admin wants to setup from variant interface in directus panel. currently spec groups flow is only in product interface

**CLAUDE:** This flips the earlier "make the variant side read-only" plan — the admin wants the variant to be a real entry surface, not a reference view. One fact shapes everything here: **a spec is owned by a product, not a variant**, and Directus nested inline-create can't pass a parent's product down into a drawer opened from inside a variant. That splits the ask in two: filling values for existing specs is pure interface config; *creating* new specs/groups from the variant needs the spec's `product` field to go nullable plus one small Flow to backfill it from the variant's product after save. That Flow is legitimate — it fills a value the native UI genuinely can't infer — unlike the sync-duplicates Flow rejected earlier.

*Rewrites the proposal around this: `product_specs.product` nullable, the backfill Flow, and the product-agnostic grouping (`is_global` + M2M) — which turns out to be required for the variant door too, since a group `[+]` opened from inside a variant has no product to infer either. The two earlier threads converge into one design.*

---

## ACT V — Building It

**USER:** ok.. now implement your proposal using mcp. and then seed data according to directs/seed-data folder. must not forget to update the astro implementation with updated logic and schema

*Execution, in order:*
- **Schema, live via MCP** — `product_specs.product` made nullable; `product_spec_groups.product` dropped; `is_global` boolean added; `products_spec_groups` M2M junction created with both relations; the 8 existing groups (Drilling Capacity, Dimensions, Diesel Engine...) flipped to `is_global = true`.
- **Variant door configured** — `product_variants.specs` given a grouped display template (`{{spec.group...}} · {{spec.label}} = {{value}}`) and inline-create enabled on the `spec` picker.
- **The Flow, built and proven live** — three operations (guard → read variant's product → update spec), wired and tested for real: Claude nulled a spec's `product`, touched its variant-value, and confirmed the Flow restored it. *(First attempt didn't fire — the test payload lacked `spec`/`variant`, so the guard correctly skipped it. Retried with the full payload; the backfill landed.)*
- **Seeding hit a snag worth noting**: `directus/seed-data/barkomas-products.json` stores specs as a denormalized `group → variant → property` matrix, not Directus rows, and the MCP server turned out to point at a *remote* Directus (`dev-tamim.fly.dev`) rather than localhost. Claude authenticated directly via the admin REST API for bulk efficiency, ran a dry-run to confirm all variant SKUs mapped and the already-seeded product would be correctly skipped, then applied it — disabling the new Flow during the bulk insert (since `product` was being set explicitly) and re-enabling it after. Result: 5 products seeded, 221 spec rows, ~555 per-variant values, all on the shared global groups; 8 new groups created (Main Hoist, Jib Crane, Flush Pump...) for spec sections the first product didn't have.
- **Astro and docs** — `is_global` added to `types.ts` and the `api.ts` fetch fields for type-completeness; `product-catalog-schema.sql` and the schema guide rewritten to describe the M2M, the nullable FK, and the backfill Flow. `ASTRO_ADAPTER=cloudflare npm run build` passed clean across all six products in both locales.

---

## CODA — "Same As Before?"

**USER:** i don't see any changes in any .astro files.. everything is same as before?

**CLAUDE:** That's correct, not an oversight. Every change — the M2M grouping, the nullable FK, the backfill Flow, the variant display template — only changes *how editors author* groups and specs in the Directus admin panel. The data shape returned to the frontend never moved: a published spec still has `group → translations.name`, `translations.label/value`, `spec_variant_values[]`, exactly as `ProductSpecs.astro` already expected. Whether a group is global or M2M-linked is resolved before a spec ever reaches the product page. The only frontend deltas were in `.ts` files, for type-completeness — no component reads `is_global`, so none needed editing.

*The episode closes on the point that made the whole design work: the fix lived entirely in how the admin panel lets editors reach the data, never in what the data looked like once it got there.*
