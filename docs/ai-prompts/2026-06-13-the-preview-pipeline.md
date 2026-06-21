# Episode: "The Preview Pipeline"

**Spans:** 2026-06-13 → 2026-06-16
**Setting:** Barkomas is a fully static Astro site fed by a Directus CMS running on Fly.dev. The user wants editors to preview draft content without leaving the static-site model intact — a request that quietly drags the whole production deployment architecture out into the open.

---

## ACT I — SPLITTING THE STATIC SITE

*A simple-sounding request opens the episode.*

**USER:** can we add preview/...slug pages.. it would be fully same as @frontend/src/pages/[lang]/[...slug].astro , but only preview/* pages will not be static page, it should be server side rendered.. you clear?

**CLAUDE:** This is a meaningful architectural change since the project is "fully static" — adding an SSR route requires opting into Astro's per-page SSR (`export const prerender = false`), which needs a configured adapter, plus a way to fetch draft/unpublished content from Directus.

*Claude asks three clarifying questions before writing a line of code: how should preview be authenticated, and is Cloudflare's adapter really the deploy target. The user answers: no separate auth (the public role already permits drafts), a shared-secret query param (`?token=`), and yes — Cloudflare is the real target.*

*Mid-build, the user interrupts with a constraint that reshapes the implementation:*

**USER:** don't duplicate code, make reusable components

*Claude pulls the rendering logic out of the existing static `[...slug].astro` into a new shared `SlugContent.astro`, adds a `resolveSlugRoute()` resolver to `catalog.ts` that mirrors `getStaticPaths()` matching but runs per-request, and threads an optional `preview` flag through every `api.ts` fetch function via a `publishedFilter()` helper that drops the `status: published` filter when previewing. Both the static page and the new SSR `/preview/[lang]/[...slug].astro` route now call the same component.*

*The user pushes back on the env-reading approach, sharing code from a previous project:*

**USER:** as far i know, env loading in cloudflare environment is kinda tricky... i did something like below thing in another project
```ts
static get(key: string): string | undefined {
  if (EnvUtility.metaEnv?.[key]) return EnvUtility.metaEnv[key];
  const cloudflareEnv = (EnvUtility.Astro?.locals as any)?.runtime?.env?.[key];
  if (cloudflareEnv) return cloudflareEnv;
  ...
}
```

**CLAUDE:** Good catch — for Cloudflare, runtime secrets set via wrangler/dashboard land in `Astro.locals.runtime.env`, not `import.meta.env` (which only has build-time values). Let me add a small helper and use it.

*A `getRuntimeEnv` helper is born — first version checks `Astro.locals.runtime.env`, falling back to `import.meta.env`. It will not survive the episode unchanged.*

**USER:** i still see env reading in @frontend/src/lib/directus.ts

**CLAUDE:** `directus.ts` is intentionally different — `DIRECTUS_URL`/`ASSETS_URL` are read at module-load time and used by `getStaticPaths()` during the static build (no `Astro` request context exists there). Vite inlines `import.meta.env.X` as build-time constants, which is correct for these: they're build config, not secrets that need rotating without a rebuild.

**USER:** in preview pages, aren't we using directus instance? under the hood directus instance will be accessed at runtime

**CLAUDE:** You're right that `directus.request()` calls execute at request time — that's the whole point of SSR there. But the *client itself* is a module-level singleton, constructed once when the Worker's module graph loads, using values Vite already inlined as literals at build time. The request happens at runtime; the URL it points to is fixed at build time, baked into the bundle.

*Satisfied, the user asks the distinction to be written down for future sessions: `.claude/agents/barkomas.md` gets an "Env vars in SSR pages (Cloudflare)" section. It will need correcting twice before the episode ends.*

*The first deploy attempt surfaces something much bigger than an env var bug.*

**USER:** preview pages not working on production.. what's wrong? if i visit something under proview/* it redirects me to / page

**CLAUDE:** That symptom points to the build not producing the SSR preview route at all, and your host serving `index.html` as a fallback.

*Claude runs a local Cloudflare-adapter build and confirms the route compiles correctly into `dist/server/entry.mjs`. The real cause is bigger and uglier.*

**USER:** i tried to see cloudflare functions log, and got: `You can not tail this deployment as it does not have a Pages Function, you cannot tail a static site. Deploy a Function to begin tailing.`

**CLAUDE:** This confirms it. `@astrojs/cloudflare` v13 is **Workers-only** — it no longer produces Pages Functions output. Your production deployment is a **Cloudflare Pages** project deployed as a **static site**. So `/preview/*` simply doesn't exist anywhere in production, regardless of any routing settings — there's no SSR backend at all. This is a deployment-target mismatch, not a code bug.

*Two paths exist: downgrade the adapter to regain Pages Functions output (a step backward onto a deprecated path), or migrate the whole deployment to Cloudflare Workers + Static Assets, which is what the installed adapter actually produces. Claude recommends the migration and proves it's viable with a dry run: `npx wrangler deploy -c dist/server/wrangler.json --dry-run` succeeds — 20 modules, 1.3MB, all bindings detected correctly. The plan: a new Workers Builds project pointed at the same repo, root directory `frontend`, deploy command `npx wrangler deploy -c dist/server/wrangler.json`. The actual cutover is left to the user — dashboard work, not code.*

---

## ACT II — THE VANISHING SECRET

*A build error on the new infrastructure, with a stack trace pointing somewhere unexpected:*

**USER:** ```
Failed to get static paths from the Cloudflare prerender server (500: Internal Server Error).
Error: Network connection lost.
```

**CLAUDE:** Found it. Astro 6's Cloudflare adapter runs `getStaticPaths()` inside a sandboxed `workerd` runtime by default, which has restricted/unreliable outbound `fetch` to your Directus API — a known regression, fixed via `prerenderEnvironment: "node"` in Astro 6.0.3+.

*The fix verifies clean across a full multi-locale build. (The user will later revert this change outside the conversation — a fact Claude notices and respects without being asked, leaving it alone for the rest of the episode.)*

*The Workers migration goes live. A new mystery immediately appears:*

**USER:** now deployed successfully.. nice... but getting not found when hit `https://dev-tamim.v1adm9.workers.dev/preview/en-US?token=wow-view`

**CLAUDE:** Both responses are byte-identical regardless of token — that points to `getRuntimeEnv("PREVIEW_SECRET")` returning `undefined` on the deployed Worker. Pages env vars don't carry over to a Workers project automatically; `PREVIEW_SECRET` needs to be set as a secret on this specific Worker.

*The user sets it. It still doesn't work. Debug logs go in at every layer — the preview route, then `env.ts` itself — until a Cloudflare log stream finally tells the real story:*

**USER:** got this log from cloudflare log stream:
```
"[env] cloudflare:workers import ok, available keys:", ["SESSION", "ASSETS"]
```

**CLAUDE:** `PREVIEW_SECRET` isn't bound to this Worker at all.

**USER:** not only this, there are other variables also set in cloudflare worker settings.. but see the log, there is only SESSION and ASSETS variable!

**CLAUDE:** That explains it. `wrangler deploy` **deletes all dashboard-set plaintext "Environment Variables"** before applying whatever `vars` are in the deployed config — and since `dist/server/wrangler.json` declares no `vars`, every git-triggered deploy wipes them. Only `SESSION`/`ASSETS` survive because those are explicit bindings declared in the generated config.

*`"keep_vars": true` goes into `wrangler.jsonc`. Verified in a build that it merges correctly. Deployed. Still missing.*

**USER:** still not available.. maybe keep_vars is not working as expected

**CLAUDE:** `keep_vars: true` *is* working — note `env.SESSION (inherited)` in the bindings table from your last deploy log. But `PREVIEW_SECRET` doesn't appear anywhere, not even as inherited. That means it simply isn't configured on the Worker at all right now — either it was saved as a plain dashboard "Variable" and got wiped by a deploy that happened *before* `keep_vars` existed, or it was never actually saved to this Worker in the first place. Re-add it via the dashboard using the **"Encrypt"** toggle — Secrets survive deploys regardless of `keep_vars`.

*Off-screen, the user fixes it properly. The thread moves on.*

*Two smaller bugs surface and get fixed quickly. First, the homepage itself:*

**USER:** when i visit `https://dev-tamim.v1adm9.workers.dev/preview/en-US` page, the slug is null in the preview route file, hence i get 'Not found' in response.. but i wanted to see preview of homepage

**CLAUDE:** Found it — `catalog.ts` explicitly excludes `permalink === "/"`, since the static route lets `[lang]/index.astro` own the homepage. For preview, an empty slug should resolve to the homepage page.

*One conditional fixed. Then a UX request:*

**USER:** in preview/* pages, all kind of href should be under preview/* page... maybe we can run a script on page load to modify href links in all places

**CLAUDE:** Done. Any internal `<a href="/...">` link rendered on a `/preview/*` page gets rewritten client-side to `/preview/...?token=<token>`, so navigation stays within preview mode.

*A small client-side script in `BaseLayout.astro`, gated behind the `preview` prop, closes out the act.*

---

## ACT III — CONTENT VERSIONING

*The user returns with the feature that started this whole detour, now that the plumbing exists to support it.*

**USER:** can we implement content versioning in preview pages? there can be a dropdown as a topbar to select version, if selected set version as query param, then fetch content for that version.. that topbar will be kinda fixed/sticky only on preview pages, if scroll down, this topbar hides, shows up on scroll up... https://directus.com/docs/guides/content/content-versioning

*Claude researches Directus' versioning API and finds a critical constraint: the `version` query param only works on the single-item-by-id endpoint, never on filtered list queries. Since the app resolves content by `permalink`/`slug`, every versioned fetch needs a two-step dance — resolve the id first, then `readItem(id, { version })`. This goes into `fetchPageByPermalink`, `fetchPostBySlug`, and `fetchProductBySlug`, alongside a new `fetchContentVersions()` that queries Directus' `/versions` endpoint directly.*

*A `PreviewToolbar.astro` component is built: a sticky bar with a version `<select>`, hide-on-scroll behavior mirroring the existing Navbar pattern via a `--preview-bar-h` CSS variable that both the Navbar and `<main>` padding read from.*

*First bug, caught by the user immediately:*

**USER:** error in @frontend/src/pages/preview/[lang]/[...slug].astro file.. why didn't you checked properly!?

**CLAUDE:** The bug: I removed the `token` prop from `SlugContent`'s `Props` interface earlier but forgot to remove it from this call site. Fixed — sorry for missing that.

*A second oversight, smaller but pointed:*

**USER:** why haven't you spin down the dev 4321 port?

**CLAUDE:** My earlier `pkill` didn't actually match this process. Killing it now.

*Then the feature itself doesn't show up at all:*

**USER:** i don't see the topbar to select version!

**CLAUDE:** The toolbar is gated on `versions.length > 0`, but "Published" and "Draft" are always-available options, not from the fetched list — so the toolbar should show whenever `preview` is true, regardless of whether any named versions exist.

*Claude's first fix is too broad — it would also disable link-rewriting on category pages, which share the same `preview` flag. Caught and corrected in the same breath:*

**CLAUDE:** I made a mistake — overriding `preview` would also disable the link-rewriting script on category pages. Let me use a separate prop instead.

*A `versionable` flag is threaded alongside `preview`: true for page/post/product routes, false for categories (which Directus versioning doesn't support). The toolbar finally appears.*

*The user, checking Claude's homework against the official docs:*

**USER:** see https://directus.com/docs/frameworks/nextjs/live-preview-content-versioning

**CLAUDE:** That confirms our approach matches the official pattern — their `getPostById` already works by id; our `resolveItemId` two-step exists only because our routes use `permalink`/`slug` instead of `id`. Notably, the guide doesn't cover `directus_versions` permissions or how to list/select versions in a custom UI either — that's the gap our `PreviewToolbar` fills.

*Then a design philosophy challenge that ripples through the whole fetch layer:*

**USER:** published filter should always be there... so no need of publishedFilter in @frontend/src/lib/api.ts

*Claude asks one clarifying question before touching code: does this mean preview should only ever show version-overlays on already-published items, never raw unpublished records? The user confirms: yes. `publishedFilter()` and the `preview` boolean it threaded through eight functions are torn out entirely — `fetchPageByPermalink`, `fetchAllPages`, `fetchPostBySlug`, `fetchAllProductSlugs`, `fetchProductsByCategory`, `fetchProductBySlug`, `fetchAllCategories`, `fetchCategoryById` all just filter `status: published`, unconditionally. `resolveSlugRoute()` loses its `preview` parameter too. Preview now works purely through content-version overlays on top of published content — a cleaner model that matches how Directus' own versioning feature is designed to be used.*

*A permission wall appears almost immediately:*

**USER:** why i am getting this error
```
{"message":"You don't have permission to access this.","extensions":{"code":"FORBIDDEN"}}
```

**CLAUDE:** This is the same root cause flagged earlier — the public role doesn't have read access to `directus_versions`. It's now surfacing more broadly because **any** request with `?version=...` requires Directus to read that table to apply the version's delta. Both listing versions and fetching a specific version need the same fix: grant the Public role read access, fields `key`, `name`, `collection`, `item`, `delta`, `date_updated`.

*Claude finds admin credentials sitting in `directus/.env` and could fix this directly — but flags it instead of acting, since it would mean editing access control on a shared instance without asking first. The user grants the permission themselves. The error doesn't go away — it just changes shape, revealing a second, subtler problem:*

**CLAUDE:** Found it — the public role can now list `directus_versions`, but **no content version named "draft" actually exists yet** for the homepage. Requesting `?version=draft` on an item with no such version returns `FORBIDDEN` rather than falling back to the main item.

*Two defensive fixes follow: the toolbar stops hardcoding a "Draft" option that might not exist (it now only lists versions Directus actually returns), and every versioned `readItem` call gets wrapped so a missing/stale version falls back to the published item instead of crashing the page. Verified clean, then committed.*

**USER:** commit with nice message and description

**CLAUDE:** Committed as `d3c64a5`.

---

## ACT IV — THE DEPLOY BUTTON AND THE SLEEPING BACKEND

*With versioning working, the user asks for one more piece of editor tooling, layered onto the same toolbar.*

**USER:** i want to add a button at the topbar near version selector, this button can trigger production deploy.. cloudflare deploy hook will be set in env file... when that button is clicked, a confirmation modal will open explaining what will happen, if confirmed, then hit the deploy hook..

**CLAUDE:** Good idea. I'll route the deploy through a server-side endpoint so the Cloudflare hook URL never hits the client — only the preview token is sent from the browser.

*A new `src/pages/api/deploy.ts` SSR endpoint validates the preview token server-side, then POSTs to a `DEPLOY_HOOK_URL` read from the runtime env — the hook URL itself never reaches the browser bundle. `PreviewToolbar.astro` gets a "Deploy" button (visible only when the hook is configured) and a confirmation modal that explains the consequences before firing. Claude verifies the UI by temporarily setting a dummy hook URL, confirming the button and modal render, then reverting it.*

*The next request reveals a problem that has nothing to do with the toolbar at all — it's about what happens during a production build:*

**USER:** in build time, not in preview pages, in static file generation, astro hits directus backend to get the content data... but here, the backend is deployed on fly .dev which gets sleep after awhile. so we need to ping the backend before doing content fetch, because without triggering, the backend is in sleep, even though first content fetch call triggers the backend but the astro fetch doesn't resolve for some reason and build fails...

**CLAUDE:** The right place for this is a custom Astro integration with the `astro:build:start` hook — runs once before any `getStaticPaths` calls, so Directus is warm by the time content fetching begins.

*A `wakeDirectus()` integration goes into `astro.config.mjs`: it polls `DIRECTUS_URL/server/health` every 3 seconds for up to 90 seconds before the build proceeds, throwing a clear error if Directus never wakes up rather than letting the build hang or fail cryptically mid-prerender.*

**USER:** if directus url is not present in env, no need to fallback to localhost

*A one-line correction: the integration now throws immediately if `DIRECTUS_URL` is unset, rather than silently defaulting to `http://localhost:8055` and failing confusingly later. Committed as `8e4270b`.*

**USER:** when does the new wakeDirectus functions gets called? do i need to do anything on cloudflare config or wranger json?

**CLAUDE:** `astro:build:start` is a **build-time** hook — it fires when `npm run build` is called, before Astro starts generating any pages. No wrangler.jsonc changes needed, no Workers config needed — this has nothing to do with the SSR Worker runtime. The one thing to verify: `DIRECTUS_URL` must be available as an environment variable during the Cloudflare Pages *build* itself, not just locally.

*The episode closes here — four days, one feature request about preview pages that became a full audit of the production deployment pipeline along the way.*
