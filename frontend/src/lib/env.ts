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
    console.log("[env] cloudflare:workers import ok, available keys:", Object.keys(env as object));
    const value = (env as Record<string, string | undefined>)[key];
    console.log(`[env] cloudflare:workers env["${key}"] present:`, value !== undefined);
    if (value) return value;
  } catch (err) {
    console.log("[env] cloudflare:workers import failed:", err);
  }
  const fallback = import.meta.env[key];
  console.log(`[env] import.meta.env["${key}"] present:`, fallback !== undefined);
  return fallback;
}
