// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const { ASTRO_ADAPTER } = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  // Locales are driven dynamically by the Directus `languages` collection.
  // getStaticPaths() in src/pages/[lang]/index.astro fetches them at build time —
  // adding a new language in Directus is picked up automatically on next build.
  trailingSlash: "never",

  // Site is fully static (no SSR). Set ASTRO_ADAPTER=cloudflare in .env to deploy via
  // the Cloudflare adapter — it makes Cloudflare deploy as static assets correctly
  // instead of guessing via generic framework detection.
  adapter: ASTRO_ADAPTER === "cloudflare" ? cloudflare({ imageService: "passthrough" }) : undefined,

  vite: {
    plugins: [tailwindcss()],
  },
});
