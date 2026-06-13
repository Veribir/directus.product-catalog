import type { ProductPageTemplate, ProductTemplateBlock, Product, ProductCategoryRef, ProductUrlStructure } from "./types";
import {
  fetchAllPages,
  fetchPostsPagePermalink,
  fetchProductsPagePermalink,
  fetchAllCategories,
  fetchAllProductSlugs,
  fetchPostBySlug,
  fetchGlobals,
} from "./api";

// ─── Default template ─────────────────────────────────────────────────────────

/**
 * Code-level fallback used when a product has no `page_template` and its
 * category has no `default_page_template`. Mirrors the legacy
 * DEFAULT_PRODUCT_PAGE_TEMPLATE sections (gallery, certifications, related,
 * content blocks, breadcrumb — pricing table off by default) using the new
 * tabs/blocks shape.
 */
export const DEFAULT_PRODUCT_PAGE_TEMPLATE: ProductPageTemplate = {
  id: "__default__",
  name: "Default",
  tabs: [
    {
      id: "__default_tab__",
      key: "overview",
      icon: null,
      sort: 1,
      translations: [],
      blocks: [
        {
          id: "__default_hero__",
          sort: 1,
          collection: "block_product_hero",
          hide_block: false,
          item: { id: "__default_hero__", status: "published", show_breadcrumb: true },
        },
        {
          id: "__default_content_slot__",
          sort: 2,
          collection: "block_product_content_slot",
          hide_block: false,
          item: { id: "__default_content_slot__", status: "published" },
        },
        {
          id: "__default_gallery__",
          sort: 3,
          collection: "block_product_gallery",
          hide_block: false,
          item: { id: "__default_gallery__", status: "published" },
        },
        {
          id: "__default_cert_cards__",
          sort: 4,
          collection: "block_product_card_grid",
          hide_block: false,
          item: { id: "__default_cert_cards__", status: "published", source: "certifications" },
        },
        {
          id: "__default_related__",
          sort: 5,
          collection: "block_product_related",
          hide_block: false,
          item: { id: "__default_related__", status: "published" },
        },
      ],
    },
  ],
};

// ─── Category path resolution ─────────────────────────────────────────────────

type CategorySlimNode = {
  id: string;
  slug: string;
  parent: string | null;
  translations?: { languages_code: string; slug?: string | null }[];
};

function resolveLocalizedSlug(node: CategorySlimNode, locale: string): string {
  if (node.translations && node.translations.length > 0) {
    const localeSlug =
      node.translations.find((t) => t.languages_code === locale)?.slug ??
      node.translations.find((t) => t.languages_code === "en-US")?.slug;
    if (localeSlug) return localeSlug;
  }
  return node.slug;
}

/**
 * Builds a Map<categoryId, fullSlugPath> for all categories.
 * Locale-aware: uses translations[locale].slug → translations['en-US'].slug → category.slug.
 * Throws if two sibling categories resolve to the same slug (collision check).
 */
export function buildCategoryPaths(
  categories: CategorySlimNode[],
  locale = "en-US",
): Map<string, string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const memo = new Map<string, string>();

  function getPath(id: string): string {
    if (memo.has(id)) return memo.get(id)!;
    const cat = byId.get(id);
    if (!cat) return "";
    const slug = resolveLocalizedSlug(cat, locale);
    const path = cat.parent ? `${getPath(cat.parent)}/${slug}` : slug;
    memo.set(id, path);
    return path;
  }

  for (const cat of categories) getPath(cat.id);

  // Collision check: no two categories may have the same full path
  const seen = new Map<string, string>();
  for (const [id, path] of memo) {
    if (seen.has(path)) {
      throw new Error(
        `Category slug collision: "${path}" is used by both "${seen.get(path)}" and "${id}". Fix slugs in Directus.`,
      );
    }
    seen.set(path, id);
  }

  return memo;
}

/**
 * Returns all descendant category IDs (not including the root itself).
 */
export function getDescendantIds(
  categoryId: string,
  allCategories: { id: string; parent: string | null }[],
): string[] {
  const children = allCategories.filter((c) => c.parent === categoryId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(c.id, allCategories)]);
}

/**
 * Resolves the full URL path for a product slug given its category and the
 * configured URL structure:
 *   category_prefixed — full ancestor path  /electronics/headphones/earbuds
 *   parent_prefixed   — direct parent only  /headphones/earbuds
 *   root_prefixed     — root category only  /electronics/earbuds
 *   flat              — product slug only   /earbuds
 */
export function getProductFullPath(
  productSlug: string,
  categoryId: string | null,
  catPaths: Map<string, string>,
  urlStructure: ProductUrlStructure = "category_prefixed",
): string {
  if (!categoryId || urlStructure === "flat") return productSlug;
  const catPath = catPaths.get(categoryId);
  if (!catPath) return productSlug;
  const segments = catPath.split("/");
  if (urlStructure === "category_prefixed") return `${catPath}/${productSlug}`;
  if (urlStructure === "root_prefixed") return `${segments[0]}/${productSlug}`;
  // parent_prefixed — direct parent segment (last segment of the category path)
  return `${segments[segments.length - 1]}/${productSlug}`;
}

// ─── eCl@ss resolution ───────────────────────────────────────────────────────

/**
 * Returns the effective eCl@ss code for a product.
 * Product-level code takes precedence; falls back to the category code.
 */
export function resolveEclassCode(
  product: Pick<Product, "eclass_code" | "eclass_version">,
  category: Pick<ProductCategoryRef, "eclass_code" | "eclass_version"> | null,
): { code: string; version: string } | null {
  const code = product.eclass_code ?? category?.eclass_code ?? null;
  const version = product.eclass_version ?? category?.eclass_version ?? null;
  return code ? { code, version: version ?? "" } : null;
}

// ─── Template cascade ─────────────────────────────────────────────────────────

/**
 * Resolves the active page template for a product.
 * Cascade: product.page_template → product.category.default_page_template → siteDefault.
 */
export function resolveTemplate(
  product: Pick<Product, "page_template" | "category">,
  siteDefault: ProductPageTemplate = DEFAULT_PRODUCT_PAGE_TEMPLATE,
): ProductPageTemplate {
  return product.page_template ?? product.category?.default_page_template ?? siteDefault;
}

/**
 * Flattens all tabs of a template into a single ordered list of visible
 * layout blocks (hidden blocks excluded).
 */
export function getTemplateBlocks(template: ProductPageTemplate): ProductTemplateBlock[] {
  return template.tabs
    .flatMap((tab) => tab.blocks ?? [])
    .filter((b) => !b.hide_block)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

// ─── Slug routing ──────────────────────────────────────────────────────────────

/**
 * Discriminates which kind of content a `/[lang]/[...slug]` URL resolves to.
 * Shared between the static route (resolved at build time via getStaticPaths)
 * and the SSR preview route (resolved per-request).
 */
export type SlugRouteProps =
  | { type: "page"; permalink: string }
  | { type: "post"; postSlug: string; postsPagePermalink: string }
  | {
      type: "category";
      categoryId: string;
      categoryPath: string;
      productsPagePermalink: string;
      urlStructure: ProductUrlStructure;
    }
  | {
      type: "product";
      productSlug: string;
      productsPagePermalink: string;
      urlStructure: ProductUrlStructure;
    };

/**
 * Resolves a `/[lang]/[...slug]` path to its content type at request time.
 * Used by the preview route, which has no static path list to look up.
 * When `preview` is true, draft/archived content is eligible to match.
 */
export async function resolveSlugRoute(
  slug: string,
  lang: string,
  preview: boolean,
): Promise<SlugRouteProps | null> {
  const [pages, postsPagePermalink, productsPagePermalink, allCategories, globals] = await Promise.all([
    fetchAllPages(preview),
    fetchPostsPagePermalink(),
    fetchProductsPagePermalink(),
    fetchAllCategories(preview),
    fetchGlobals(),
  ]);

  const urlStructure: ProductUrlStructure = globals.product_url_structure ?? "category_prefixed";
  const normalizedSlug = slug.replace(/^\//, "");

  const page = pages.find((p) => p.permalink !== "/" && p.permalink.replace(/^\//, "") === normalizedSlug);
  if (page) return { type: "page", permalink: page.permalink };

  const postsPrefix = postsPagePermalink?.replace(/^\//, "") ?? null;
  if (postsPrefix && normalizedSlug.startsWith(`${postsPrefix}/`)) {
    const postSlug = normalizedSlug.slice(postsPrefix.length + 1);
    const post = await fetchPostBySlug(postSlug, preview);
    if (post) return { type: "post", postSlug, postsPagePermalink: postsPagePermalink! };
  }

  const productsPrefix = productsPagePermalink?.replace(/^\//, "") ?? null;
  if (productsPrefix && normalizedSlug.startsWith(`${productsPrefix}/`)) {
    const remainder = normalizedSlug.slice(productsPrefix.length + 1);
    const catPathMap = buildCategoryPaths(allCategories, lang);

    for (const [categoryId, categoryPath] of catPathMap) {
      if (categoryPath === remainder) {
        return {
          type: "category",
          categoryId,
          categoryPath,
          productsPagePermalink: productsPagePermalink!,
          urlStructure,
        };
      }
    }

    const productSlugs = await fetchAllProductSlugs(preview);
    for (const p of productSlugs) {
      const fullPath = getProductFullPath(p.slug, p.category?.id ?? null, catPathMap, urlStructure);
      if (fullPath === remainder) {
        return {
          type: "product",
          productSlug: p.slug,
          productsPagePermalink: productsPagePermalink!,
          urlStructure,
        };
      }
    }
  }

  return null;
}
