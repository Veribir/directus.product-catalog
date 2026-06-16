export const prerender = false;

import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../lib/env";

export const POST: APIRoute = async ({ url }) => {
  const PREVIEW_SECRET = await getRuntimeEnv("PREVIEW_SECRET");
  const token = url.searchParams.get("token");

  if (!PREVIEW_SECRET || token !== PREVIEW_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const DEPLOY_HOOK_URL = await getRuntimeEnv("DEPLOY_HOOK_URL");
  if (!DEPLOY_HOOK_URL) {
    return new Response(JSON.stringify({ error: "DEPLOY_HOOK_URL is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(DEPLOY_HOOK_URL, { method: "POST" });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Deploy hook returned ${res.status}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
