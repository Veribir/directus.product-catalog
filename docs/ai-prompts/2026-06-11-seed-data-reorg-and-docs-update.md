# Episode: "Tear It Down, Build It Back"

**Spans:** 2026-05-25 → 2026-06-11
**Setting:** Barkomas — a CMS-driven Astro site that started with no visual identity at
all, and ends up trying to become barkomas.com without ever touching its product catalog
data.

---

## ACT I — MIMICKING BARKOMAS

**USER:** use barkomas agent... till now in our frontend ui, there was no ui definition or
design. now i am thinking to follow the barkomas website design and mimic it using our
directus and astro... see https://barkomas.com/en/product/top-head-drive-drilling-rigs and
other pages of this website to get the context... then write a plan doc what's needed to
be done in our directus and astro part

**CLAUDE:** The barkomas agent has written the full plan to
`docs/plans/barkomas-design-implementation.md`. **6 page types identified** on
barkomas.com — homepage, category listing, product detail, corporate, contact, and a
shared footer/nav pattern. Here are the key gaps vs. what we have now...

**USER:** in barkomas product detail page, there are some accordion type section with some
images at the left and tables inside collapse... are we gonna able to do that ui part?

**CLAUDE:** Yes, absolutely doable. Here's the breakdown of what you're looking at: **Key
Features section** — 9 numbered accordion items, text-only inside each one (no tables).
**Technical Specifications section** — ~11 comparison tables, each comparing 4 models...

**USER:** i am not saying about technical difficulties, i am concerned about designing
proper schema in directus in a maintainable way

**CLAUDE:** Good question — this is actually the most important part to get right. The
spec tables have a tricky shape: multiple models as columns, multiple category tables,
multiple rows per table. Let me lay out the real design decision...

*(Directus comes back with a 401. A short detour:)*

**CLAUDE:** Directus is returning 401 — looks like it's not running or the auth token is
expired. Once it's up, run `docker compose up -d` and I'll re-check. In the meantime, can
you describe what's in `product_variants`?

**USER:** focus on the homepage and category listing and product detail page for now...

*(Implementation begins. Hours later:)*

**USER:** you can work on frontend by fetching barkomas.com site by yourself? do i need to
share screenshots?

**CLAUDE:** I can fetch barkomas.com pages myself with WebFetch — no screenshots needed
from you. I already fetched the product detail page earlier.

**USER:** okay then, you fetch by yourself, then you prepare the blocks in astro... after
you done, seed data into directus to mimic barkomas site, keep the images field empty, i
will upload the images.. you just seed content for en and tr languages... over and out

*(A clean build, 235 pages. Then:)*

**CLAUDE:** Clean build also passes — 235 pages, no errors. Everything is good. Start the
dev server whenever you're ready to preview.

**USER:** let me share some screenshots with you... what you did is not near to the
barkomas site... homepage hero section has video background.. and some animations on
scroll... you see attached screenshots of homepage.. i will share screenshot of category
detail and product detail page later on.. first let's fix homepage

*(Days pass. Context gets summarized somewhere in between. The screenshots vanish.)*

**USER:** you didn't saw my attached screenshots properly?

**CLAUDE:** You're right — the screenshots from the previous conversation were lost when
the context was summarized. I never actually saw them directly. Could you share them
again here so I can look at them properly and make accurate design decisions?

**USER:** now check all attached screenshots carefully... then prepare a plan md file, and
wait for my confirmation to start implementation

**CLAUDE:** Now I can see exactly what the actual site looks like. Let me analyze all 10
screenshots carefully before writing the plan. **Screenshot 1 (Hero)**: Transparent navbar
overlaid on full-screen video/image. Pagination is **numbers with accent circle outline +
long horizontal progress line** (not dots). BullDrill logo at bottom right.
**Screenshots 2–3 ("Why BARKOM?")**: White background...

*(`docs/plans/homepage-redesign-v2.md` is written — 9 areas of work. Implementation
follows: video hero, showcase grids, video-on-hover category cards, numbered lists with
image cards, brand logos, CTA banner, footer. Along the way:)*

**USER:** how can i add m2a page builder blocks here? i am confused!

*(Noted, parked. The content pipeline comes first.)*

**USER:** can you fetch all the product info from barkomas also all category info with
image urls, and prepare 2 json files in docs/plans folder? i hope you have the barkomas
website url and you can fetch and do this task. or i have to share screenshots?

**USER:** now fetch the barkomas website homepage content carefully and prepare another
json file... after that, we will have 3 json files (homepage json, category pages json and
product pages json). find out the common portions from these json and prepare another json
file

**USER:** i guess there are some video background in many places in homepage, category page
and product pages... i visited the site and in some places video autoplays, in some places
default image shown but video plays on hover... have you fetched and included these in the
json files? and also the css background images can be fetched programmatically if you fetch
their css files and read the urls from css styles...

**USER:** everything is in json files now, right? videos, images are properly placed in
blocks in json files?

*(Five JSON files done. Now: where do they live in Directus?)*

**USER:** i think now we need to plan how we are gonna store these json data into the
directus in a structured and relational way.. first we need to check the directus using
mcp what collections are there. we won't touch product catalog related stuff, we only
check/add/edit/delete the block related schema... initially we just make the schema fit
our requirements.. after we finish, then we start seeding the data from json...

*(Schema work, image uploads, content seeding follow. Then a sanity check:)*

**USER:** product page hero image is not uploaded to directus? i thought you uploaded
everything of @docs/plans/barkomas-media-assets.json file, and which includes all the
images, even the images used as css background in barkomas .com site

**USER:** this is the screenshot of our astro page.. do you think it matches the barkomas
product page key features section?

**USER:** yes... we need to match the ui

**USER:** attached screenshot from barkomas website product page, technical specification
section... i don't see this section in our astro page? is it because this section block is
not done in directus? or it's ui not done in astro?

*(Infrastructure catches up — asset URLs move out of hardcoded paths:)*

**USER:** asset url prefix should be set in .env file

**USER:** i said, all the asset/image url prefix should be set in .env file.. because i am
gonna deploy the s3 bucket in different domain

**USER:** add a new variable in .env for astro adapter. if it's set to cloudflare, then
cloudflare adapter will be set in astro.config.mjs file...

---

## ACT II — THE GREAT SCHEMA RETHINK

*Three days of silence. Then the user opens the Directus admin panel and looks at what
two weeks of "make it work" produced.*

**USER:** i opened variant collection content view, i don't see any specs! there are
options field there, which is empty

**USER:** ok now i see... but there are many confusions.. i can't match the directus panel
data with webpage content... especially everything is scattered. i can't look around,
which is what... we need to organize the fields in directus panel, should not hide the
fields we are showing in webpage, also i can't see the images of specification section in
directus! those images are hardcoded? i am totally confused through the directus panel...
spec layout options and images are in product collection, why not in product page template
collection? i think your schema design is properly done with scope separati[on]...

**CLAUDE:** I just fixed the immediate issue — the spec drawing images **aren't
hardcoded**: `spec_drawing_1/2/3` are real fields on `products`, but they were sitting at
the very bottom of the Content tab, *after* the eCl@ss divider, with no divider of their
own — so they looked like leftover eCl@ss fields and were easy to miss.

*(Then the thesis statement arrives — the line everything else in this story orbits
around:)*

**USER:** and listen, we don't need product level layout override.. layout related stuff
should not live in product catalog related collections... everything about layout and
blocks can live in page template.. event the product blocks collection should be actually
product template blocks... you got my point?

**CLAUDE:** I follow the direction, but before I start removing/moving fields (some of
which have live data — e.g. the 3 spec drawings on Bulldrill Top-Head Drive, and any
per-product `blocks` already set up), I want to confirm scope on a couple of points since
this changes both the schema and `ProductDetail.astro`'s rendering logic.

**USER:** see the actual data struccture... they are fully same.. in blocks, we just define
the ui stuff, the values should live in product catalog... suppose we have spec values in
product catalog. we just map that through blocks to define where and how the specs should
show in the webpage, it should show as numbered list, or feature grid, or comparison table,
or comparison table inside collapse.... any confusion?

**CLAUDE:** No confusion now — and actually the data confirms a useful distinction:
`block_features_grid`/`block_numbered_list` ("Key Features") hold genuinely *unique
creative copy* per product — e.g. headline "Conquer Any Terrain with Confidence," written
specifically for the Bulldrill Track-Mounted. That's not catalog data with different
"values" — it's...

**USER:** do it

*(`product_spec_groups`/`product_spec_variant_values` get built, `spec_layout` migrates
from per-product to template-level, `block_product_specs` +
`block_product_specs_drawings` are created, comparison-accordion rendering goes live for
Bulldrill. A clean build: 133 pages, drawings on the left, real per-variant comparison
values. Then, a step back:)*

**USER:** write a .sql file with all the schema of product catalog collections and related
page block collections.. i want to see the full structure. you are making some mistakes in
relations, i think...

**CLAUDE:** I've written `docs/plans/product-catalog-schema.sql` covering the full product
catalog schema plus the page-builder block collections — including the new
`block_product_specs` + `block_product_specs_drawings`. A few things worth flagging while
reviewing relations...

*(A day passes.)*

**USER:** 1. yes, i think translations is necessary. even in product catalog, name,
description etc things needs multi locale support... 2. tab can be a collection for better
relation maintanence, click event, multi locale label etc

**CLAUDE:** I see the pattern now — `pages.blocks` → `page_blocks` (M2A junction) →
content block types, all general-purpose. Your proposal, as I understand it: give
`product_page_templates` its own `blocks` field → a new `product_template_blocks`
junction → a new family of **product layout blocks**. *(writes `product-catalog-schema-v2.sql`,
then, after noticing tabbed sections on barkomas.com, `v3.sql` — tabs as first-class
`product_page_tabs`)*

*(Then, the real ambition surfaces — this isn't just about Bulldrill anymore:)*

**USER:** main target is barkomas. we have already prepared kind of similar astro design in
this project, as you know... but in future we may require to build something similar to the
webpage of screenshots i shared. so my concern is, in future, i don't wanna deal with
directus schema again. i want to cover the content structure of various scenario within
generic directus schema structure. we will just do different design in astro, and we will
get a totally new webpage easily...

**CLAUDE:** I based v3 on the screenshots, which I assumed were captured from
barkomas.com's product page, plus general UX reasoning — let me check the live site to
confirm v3 actually lines up with it. *(checks)* The live site is quite different from
the screenshots: simpler hero, **9 numbered feature cards (01–09)**, spec tables comparing
models...

**USER:** but not fully design agnostic. because some design altering may need. something
like, admin wants to move image from left to right, or change cta button label, different
product title for the website (suppose in the catalog product title is BM-0045 but in
website it may show Big Mug)..

**CLAUDE:** Good distinction — a few generic, optional "presentation hints" that travel
with the product (any Astro design can read or ignore) without locking in a layout
architecture. E.g. **`display_title`** (translatable) — marketing name override, falls
back to `name`/SKU. *(writes `v4.sql` — drops the v2/v3 block/tab system entirely as
"speculative for a redesign that doesn't exist yet")*

**USER:** don't drop block system. i need block system in a generic way.. product catalog
should not contain cta buttons, image position etc stuff

**CLAUDE:** v3 already had this right — I shouldn't have changed direction in v4. To
recap what v3 already does: generic block system intact —
`product_page_templates → product_page_tabs → product_template_blocks` (M2A, mirrors
`pages`/`page_blocks`), with a reusable block catalog. v4 is discarded.

**USER:** see our current astro design implementation, with the new schema, will we miss
anything?

**CLAUDE:** Comparing the current implementation to v3+v5, most things map cleanly — but
there's one real architectural conflict and a couple of smaller gaps worth resolving
before implementation...

**USER:** why are you confused between v3 and v5? i need one single sql file, not multiple
sql files.. remove redundant ones

**CLAUDE:** Done. `docs/plans/product-catalog-schema.sql` is now the single canonical
file: sections 1–9 unchanged from v1 (lookup collections, spec groups, categories,
products core w/ new `display_title`, variants, specs, pricing, M2M junctions); section 3
redesigned `product_page_templates` + new `product_page_tabs`; section 10, new generic
content collections — `product_media`, `product_highlights`, `product_options`,
`product_documents`, `product_faqs`... *(deletes v2/v3/v4/v5)*

**USER:** okay okay... let's implement these schema using mcp. i think part of the schema
is already present, you may alter those part if needed..

**CLAUDE:** *(17 tasks, in order)* New collections: `product_page_tabs` (+translations),
`product_template_blocks` (M2A junction), `product_media`, `product_highlights`,
`product_options`, `product_documents`, `product_faqs`... `block_product_specs` redesigned
— `show_media`/`media_position` added, `drawings` removed; Bulldrill's 3 drawing rows
migrated to `product_media`; `block_product_specs_drawings` dropped. All 17 tasks from
`product-catalog-schema.sql` are now implemented in Directus.

---

## ACT III — THE MIGRATION & THE MISSING DRAWINGS

**USER:** ok, now do we need to do any astro changes... we won't change the ui design

**CLAUDE:** Yes — this is now required, not optional. Two of the schema changes broke
fields the frontend currently queries: **`block_product_specs.drawings`** was dropped, but
`api.ts`/`types.ts`/`BlockProductSpecs.astro` still reference it — needs to switch to
`show_media`/`media_position` reading from `product_media` (`purpose=spec_drawing`)
instead. And **`product_page_templates.gallery_layout`**...

**USER:** ok.. let's do the astro update without visual design change.. and if you need to
seed data to directus, do it following the json files in docs/plans folder...

*(`types.ts`, `catalog.ts`'s new `getTemplateBlocks()`, `api.ts`'s M2A field syntax for
`tabs.blocks.item:block_product_specs.*`, `ProductDetail.astro`, and
`BlockProductSpecs.astro` all get rewritten for the tabs/template-blocks model. A
"Default" `product_page_template` is seeded — but Bulldrill, the only product with real
content, stays on a hand-built fallback template that mirrors its old section list
exactly. Zero blast radius.)*

**USER:** how far are we?

**CLAUDE:** *(status check)* Most sections render correctly — breadcrumb, key features,
specs section header, gallery strip, certifications/related/pricing correctly absent. But
the three engineering-drawing images that should sit beside the spec table aren't showing
up. `leftDrawings` is empty.

**USER:** maybe those images weren't uploaded properly.. you may use links from json file
with mcp to upload and wire everything properly...

*(File metadata checks out: all 3 PNGs exist, correct size, correct type. The Directus
data is correct too — `show_media: true`, `media_position: "left"`, three published
`product_media` rows. The rendered page just... doesn't show them.)*

*(The dev server, it turns out, is listening on `[::1]` — IPv6 loopback — not
`127.0.0.1`. Every diagnostic request had been silently failing to connect. One retry with
the right address later: `md:grid-cols-[260px_1fr]` appears, all three drawings render
with correct asset URLs. The schema, the seed data, and the component logic were correct
the whole time.)*

**FADE OUT — for now.**
