import { readFiles } from "@directus/sdk";
import { directus, ASSETS_URL } from "./directus";

// The asset host (e.g. an S3 bucket / CDN mirror) serves files by their on-disk
// filename (`{uuid}.{ext}`), not the bare Directus file UUID — so we need to resolve
// UUID → filename_disk. Fetched once per build and cached at module scope.
//
// This can't be a top-level await: Cloudflare's prerender runtime (workerd) disallows
// fetch() during module evaluation ("global scope"). Call `loadAssetMap()` once from
// BaseLayout's frontmatter — it runs before any child component renders, so every
// synchronous `assetUrl()` call afterwards resolves against a populated cache.
let filenameById: Map<string, string> | null = null;
let loading: Promise<void> | null = null;

export async function loadAssetMap(): Promise<void> {
  if (filenameById) return;
  if (!loading) {
    loading = directus
      .request(readFiles({ fields: ["id", "filename_disk"], limit: -1 }))
      .then((files) => {
        filenameById = new Map(files.map((f) => [f.id, f.filename_disk as string]));
      });
  }
  await loading;
}

export function assetUrl(id: string | null | undefined, query?: string): string | null {
  if (!id) return null;
  const filename = filenameById?.get(id) ?? id;
  return query ? `${ASSETS_URL}/${filename}?${query}` : `${ASSETS_URL}/${filename}`;
}
