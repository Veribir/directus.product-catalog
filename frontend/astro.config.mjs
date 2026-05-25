// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Locales are driven dynamically by the Directus `languages` collection.
  // getStaticPaths() in src/pages/[lang]/index.astro fetches them at build time —
  // adding a new language in Directus is picked up automatically on next build.
  trailingSlash: "never",

  vite: {
    plugins: [tailwindcss()],
  },
});
