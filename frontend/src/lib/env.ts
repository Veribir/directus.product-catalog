/**
 * Reads a runtime env var, checking the Cloudflare Workers runtime
 * (`cloudflare:workers` `env` — where wrangler/dashboard secrets land at
 * request time, set via `wrangler secret put` or the dashboard) first, and
 * falling back to `import.meta.env` (build-time `.env` values — the only
 * source in `astro dev` and non-Cloudflare builds).
 *
 * `Astro.locals.runtime.env` was removed in Astro v6 / @astrojs/cloudflare v13
 * and now throws if accessed — do not use it.
 */
export async function getRuntimeEnv(key: string): Promise<string | undefined> {
  try {
    // @ts-expect-error - "cloudflare:workers" types are only present when the
    // @astrojs/cloudflare adapter is active; resolved at runtime via try/catch.
    const { env } = await import(/* @vite-ignore */ "cloudflare:workers");
    const value = (env as Record<string, string | undefined>)[key];
    if (value) return value;
  } catch {
    // Not running on Cloudflare Workers (astro dev / non-Cloudflare build).
  }
  return import.meta.env[key];
}
