import { readFiles } from "@directus/sdk";
import { directus, ASSETS_URL } from "./directus";

// The asset host (e.g. an S3 bucket / CDN mirror) serves files by their on-disk
// filename (`{uuid}.{ext}`), not the bare Directus file UUID — so we need to resolve
// UUID → filename_disk. Fetched once per build and cached at module scope.
const files = await directus.request(readFiles({ fields: ["id", "filename_disk"], limit: -1 }));
const filenameById = new Map(files.map((f) => [f.id, f.filename_disk as string]));

export function assetUrl(id: string | null | undefined, query?: string): string | null {
  if (!id) return null;
  const filename = filenameById.get(id) ?? id;
  return query ? `${ASSETS_URL}/${filename}?${query}` : `${ASSETS_URL}/${filename}`;
}
