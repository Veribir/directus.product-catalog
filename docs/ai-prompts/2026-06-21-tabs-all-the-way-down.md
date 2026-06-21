# Episode: "Tabs All the Way Down"

**Spans:** 2026-06-16 → 2026-06-21
**Setting:** Barkomas — a Directus CMS backing an Astro storefront for drilling equipment — has a finished SQL schema and a live implementation, but no map of either. Over five days the work moves outward in rings: tidy the schema, tidy the data, tidy the page, tidy the docs, and finally tidy the tooling that does all the tidying.

---

## ACT I — "Twenty-One Collections"

*The session opens with a request for a map of the territory before anyone gets lost in it.*

**USER:** "the schema (directus/schema/product-catalog-schema.sql) is good. and we already implemented this in directus using mcp.. you may again verify... can you prepare a schema guide or summary type md file doc in docs folder, so that we don't have to read the .sql file to understand the structure.. we can easily get the birds eye view of directus ux flow from this new md file"

**CLAUDE:** Verified all 105 product catalog collections exist in Directus, matching the SQL exactly, then wrote `docs/product-catalog-schema-guide.md` — design principles, all 11 collection groups, a UX walkthrough, and a relationship map.

*(The agent file and two skills get pointers to the new guide. Committed as `f76c296`.)*

**USER:** "see `pages` collection using mcp, how the fields are organized using tabs... also see `posts` collection, how content and seo fields are separated by tabs.. in products collection and other catalog related collections, i want similar kind of separation of fields using tabs."

**CLAUDE:** Found `products` half-built — a tab container existed but sat at sort 18, orphaning everything above it — and `product_categories` with no tabs at all. Restructured both: `products` into 5 tabs, `product_categories` into 4.

**USER:** "you just modified 2 collections! i said to modify all collections in product catalog where grouping is possible to improve ux"

*(A sharp correction. Claude reads all 16 remaining product-catalog collections in parallel and applies tab grouping straight through — variants, specs, brands, pricing tiers, regions, units, customer groups, tags, media, highlights, options, documents, faqs, page tabs. The session runs out of context mid-task and resumes from a summary.)*

**USER:** "i think products collection, content tab can be split up more... page template field and blocks field can be moved to new tab, also some other fields can be moved to separate tabs"

**CLAUDE:** Proposed a 6-tab split with one new "Organization" catch-all tab.

**USER:** "yes, good proposal... your new organization tab idea is good, but i think there are too many fields in this new tab, we may split it to separate tabs.. what do you say? propose again"

**CLAUDE:** Refined to 8 tabs — Content, Catalog, Relations, Specifications, Commerce, Downloads & FAQ, Layout, SEO — splitting "Organization" into its three real concerns: where it lives in the shop, its classification standard, and its loose associations.

**USER:** "now looks good.. do it"

*(The first attempt times out mid-execution. Rather than assume it succeeded, Claude re-reads the live state, confirms the three new tabs never got created, and finishes cleanly on the second pass.)*

---

## ACT II — "The Hide Block Mystery"

*With the tabs built, attention turns to what's actually sitting inside them.*

**USER:** "i see some hidden product blocks and some redundant entries... can we cleanup the unnecessary stuff and entries throughout all collections of porduct catalog?"

**CLAUDE:** Delegated to a subagent. Found `block_product_categories` leaking into the top-level admin nav (never hidden, never grouped) and a divider with no label — fixed both, flagged the rest as harmless pre-tab leftovers.

**USER:** "good you checked the scheam.... i said to cleanup the contents.. data entries in these collections? you clear? i think due to several times of seed data, some older seed data still present"

*(Schema and data are not the same thing — a correction Claude takes on the chin. Re-scoped to the actual records and deleted 3 duplicate spec groups and 2 fictional RFQ requests with no product attached.)*

**USER:** "have you checked product blocks?"

*(It hadn't — the 19 `block_product_*` collections were missed entirely. A second pass turns up 10 orphaned block items, seed content never attached to any page or product, and deletes them.)*

**USER:** "do we need those product blocks with hide_block = true?"

**CLAUDE:** "No `hide_block` field exists in any block collection in this project. Could you be thinking of something else?"

*(A short, increasingly specific search follows — `block_numbered_list`, its child items, the page and product junction tables — none of it turns up the field.)*

**USER:** "i saw 'Hide Block' field in block numbered list"

*(Still nothing. Claude asks where exactly in the UI it's showing up.)*

**USER:** "see `product_blocks` collection, hide_block field is there"

**CLAUDE:** "Found it — it's on `product_blocks`, the M2A junction for the `products → blocks` relation."

*(Two junction rows turn out to have `hide_block = true` — seed blocks someone had switched off rather than deleted. With the user's go-ahead, both junction rows and the `block_numbered_list` items behind them are removed. The act closes by writing the tab-grouping convention permanently into the agent file and two skills, so the next session inherits the lesson instead of relearning it.)*

---

## ACT III — "Mapping the Product Page"

*Two days pass. The question shifts from the CMS to the page it renders.*

**USER:** "now can you check the product pages in astro files, if anything is hardcoded, or everything is fetched from directus... all the blocks, contents, blocks position/serial, product images, details etc etc.. then can you make a guide .md file explaining full mapping of product page, which ui part is from which field/collection"

**CLAUDE:** Produced `docs/product-page-mapping.md` and surfaced two real bugs along the way: related-product URLs always resolved flat because `category` was never fetched on that relation, and `block_product_specs` defined at the template level were silently ignored — only the product's own blocks were ever scanned.

**USER:** "resolve the bugs"

*(Both fixed and confirmed against a clean build.)*

**USER:** "now in previous analysis, you found out that there are many parts of schema doesn't have frontend coverage.. can we implement those?"

**CLAUDE:** "This is a sizeable list — implementing all of it in one pass would touch many files and several new components. Let me check how you'd like to scope it."

*(The user picks "quick wins only." Seven dormant fields go live in one pass: spec notes, media captions, certification issue dates, the rich-text description, a unit/quantity caption, an eCl@ss badge, and product tags — all newly rendered, all verified on a live build.)*

**USER:** "now use mcp to see the products collection. there is a relation with specs, which works fine, no issues. we keep it, but how about we add another relation with spec groups. because when there are so many specs, user may get lost in the list. so if the user see the groups list, then user opens any group, then shows specs list of that spec group, then user edits/sorts the specs... that would be better, right? possible to do it?"

*(The session's real architecture debate. `product_spec_groups` is a shared lookup table — the same 8 groups reused across products, a sharing model the team had deliberately enforced just one act earlier by deleting duplicates. The drill-down the user describes implies groups belong to one product. Claude names the tension instead of quietly building around it.)*

**CLAUDE:** "Directus's `list-o2m` field... has no built-in 'group accordion' drill-down. To get the UX you described, there are real trade-offs."

*(Three rounds of clarification — a flat reference list, a true per-product drill-down, a custom extension — before the user states the actual ask plainly.)*

**USER:** "see product_specs collection has relation column with products table, but product spec groups doesn't have relation. possible to add foreign key column in product_spec_groups table?"

**CLAUDE:** Confirmed it's possible, but named the real decision: a *required* FK would force every shared group to pick one owning product and break the sharing model outright. A *nullable* FK lets the 8 existing groups stay shared while new groups can opt into being product-specific.

**USER:** "Nullable hybrid (Recommended)"

*(Implemented: `product_spec_groups.product` (nullable) plus a reverse `products.spec_groups` list.)*

**USER:** "now wire the data in spec groups table. there are many spec groups, related to products through product_specs table, but now do direct relation"

*(Claude checks before assuming: all 8 existing groups turn out to already belong to exactly one product in practice. A clean backfill — no duplication, no data lost.)*

**USER:** "product_specs table has group select in the interface.. but in product_spec_groups interface, no list to see the specs of that group"

*(A reverse list is added — deliberately without a drag-sort field, since `sort` on that table was already spoken for by the per-product ordering used on the other side of the same relation.)*

**USER:** "i have tried to add specs column in product_variants table. maybe i didn't followed the best practices.. can you improve"

**CLAUDE:** "the field itself is missing the polish every other field in this schema has: it's not assigned to any tab... has no template/note, and the create/select options are unset." The relation underneath, Claude notes, was already correctly wired — the user's instinct was right; only the finishing details were missing.

---

## ACT IV — "Cleaning the House"

*The last ring: the documentation, and then the tooling that produces it.*

**USER:** "about this updates of frontend coverage and specs relation, do we need to edit the @docs/product-catalog-schema-guide.md file, @docs/product-page-mapping.md or any other doc?"

*(Both docs reconciled against the week's actual changes — seven "not rendered" gaps flipped to "rendered," the new spec-groups relation folded into the schema guide's diagrams.)*

**USER:** "now go through evverything in .claude folder. figure out the possibility to organize it better more. especially see if we can optimizely split barkomas agent file to separate skill files..."

**CLAUDE:** "There's real duplication, not just disorganization." `barkomas.md` and `directus.md` actively disagreed with each other on tab grouping and translations setup; the asset-URL pattern was duplicated even within the same file.

*(Proposed, and on approval executed, a four-part restructure: `directus.md` becomes the single source for all Directus/MCP knowledge, a new `astro.md` is created as its frontend counterpart, `barkomas.md` shrinks from 445 to 134 lines, and two decision rules graduate into proper skills — `directus-add-language` and `debug-build-error`.)*

**USER:** "commit with nice message and description"

*(Committed as `b11f75e`.)*

**USER:** "currently we have barkomas agent... any better name idea for this agent?"

**CLAUDE:** Laid out three directions — keep the project-branded name, go role-based, or go thematic to the drilling-rig product line — and recommended `catalog-engineer` if the agent definition was ever meant to generalize beyond this one project.

**USER:** "catalog engineer sounds good"

*(Renamed and committed as `8ed1324`, after confirming nothing else in the repo still pointed at the old name.)*

**USER:** "i think @CLAUDE.md file needs some updates regarding the recent changes"

*(One last pass: the root `CLAUDE.md` had drifted — three page-builder blocks documented out of twelve that actually exist, four `lib/` files missing from its table, and a flatly false "There is no SSR" line directly contradicted by the preview route added weeks before. All reconciled and committed as `1f2b4ba`.)*

*(The session closes here, with the user invoking `/prompt-history` to capture the week before moving on.)*
