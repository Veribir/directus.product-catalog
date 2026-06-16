// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const { ASTRO_ADAPTER, SITE_URL, DIRECTUS_URL } = loadEnv(
  process.env.NODE_ENV ?? "production",
  process.cwd(),
  "",
);

/** @returns {import('astro').AstroIntegration} */
function wakeDirectus() {
  return {
    name: "wake-directus",
    hooks: {
      "astro:build:start": async () => {
        if (!DIRECTUS_URL) throw new Error("[wake-directus] DIRECTUS_URL is not set");
        const base = DIRECTUS_URL;
        const url = `${base}/server/health`;
        const timeout = 90_000;
        const interval = 3_000;
        const deadline = Date.now() + timeout;

        console.log(`[wake-directus] Waiting for Directus at ${url} …`);
        while (Date.now() < deadline) {
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(interval) });
            if (res.ok) {
              console.log("[wake-directus] Directus is awake ✓");
              return;
            }
          } catch {
            // cold-start in progress — keep polling
          }
          await new Promise((r) => setTimeout(r, interval));
        }
        throw new Error(`[wake-directus] Directus did not respond within ${timeout / 1000}s — aborting build`);
      },
    },
  };
}

console.log(`Using ASTRO_ADAPTER=${ASTRO_ADAPTER}, SITE_URL=${SITE_URL}`);

// https://astro.build/config
export default defineConfig({
  // Locales are driven dynamically by the Directus `languages` collection.
  // getStaticPaths() in src/pages/[lang]/index.astro fetches them at build time —
  // adding a new language in Directus is picked up automatically on next build.
  trailingSlash: "never",

  // Required by @astrojs/sitemap to generate absolute URLs. Set SITE_URL in .env —
  // falls back to the production domain so builds without it still work.
  site: SITE_URL || "https://barkomas.com",

  // Site is fully static (no SSR). Set ASTRO_ADAPTER=cloudflare in .env to deploy via
  // the Cloudflare adapter — it makes Cloudflare deploy as static assets correctly
  // instead of guessing via generic framework detection.
  adapter: ASTRO_ADAPTER === "cloudflare" ? cloudflare({ imageService: "passthrough" }) : undefined,

  integrations: [sitemap(), wakeDirectus()],

  vite: {
    plugins: [tailwindcss()],
  },
});
