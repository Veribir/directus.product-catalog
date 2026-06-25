---
paths:
  - "directus/schema/**"
  - "frontend/src/lib/types.ts"
---

# Directus schema work — read the full reference first

You are touching the authoritative schema SQL or the frontend types that mirror it. Before
changing collections, fields, relations, or the matching TypeScript types:

- **Read `.claude/directus.md` in full** — the authoritative Directus/MCP reference. It is too
  large to auto-load every session, so it is not inlined here; open it on demand. It overrides
  anything you know from training (UUID PK pattern, system fields, status/slug, translations
  junction setup, tab grouping, file/image import via MCP, known MCP tool gotchas).
- **Keep the three layers in sync** (see `.claude/rules/frontend.md` → "Schema Change Cascade"):
  Directus field → `frontend/src/lib/types.ts` → `api.ts` fetch fields. Missing any layer causes
  a TS error or silent data gaps. Use the `/sync-types` skill to verify `types.ts` against the
  live schema.
- `directus/schema/product-catalog-schema.sql` is the single source of truth for catalog field
  names, types, enums, and FKs — keep it current when the live schema changes.
