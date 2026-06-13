import type { AstroGlobal } from "astro";

/**
 * Reads a runtime env var, checking the Cloudflare adapter's
 * `locals.runtime.env` first (where wrangler/dashboard secrets land at
 * request time) and falling back to `import.meta.env` (build-time values,
 * and the only source in `astro dev` / non-Cloudflare builds).
 */
export function getRuntimeEnv(astro: Readonly<AstroGlobal>, key: string): string | undefined {
  return (astro.locals as any)?.runtime?.env?.[key] ?? import.meta.env[key];
}
