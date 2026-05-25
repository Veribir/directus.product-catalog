import { readItems, readSingleton } from "@directus/sdk";
import { directus } from "./directus";
import type { Page, Globals, Post, Product, ProductCategory } from "./directus";

// ─── Shared field sets ────────────────────────────────────────────────────────

const PRODUCT_PAGE_TEMPLATE_FIELDS = [
  "id",
  "name",
  "gallery_layout",
  "spec_layout",
  "show_breadcrumb",
  "sections",
];

const PRODUCT_CARD_FIELDS = [
  "id",
  "slug",
  "sku",
  "price",
  "compare_at_price",
  "image",
  "rfq_enabled",
  "translations.*",
  "category.id",
  "category.translations.languages_code",
  "category.translations.name",
  "category.translations.slug",
  "brand.translations.languages_code",
  "brand.translations.name",
];

// Page block item fields — used in both page and category block queries.
const BLOCK_ITEM_FIELDS = [
  // block_hero
  "blocks.item:block_hero.id",
  "blocks.item:block_hero.image",
  "blocks.item:block_hero.layout",
  "blocks.item:block_hero.translations.languages_code",
  "blocks.item:block_hero.translations.tagline",
  "blocks.item:block_hero.translations.headline",
  "blocks.item:block_hero.translations.description",
  // block_richtext
  "blocks.item:block_richtext.id",
  "blocks.item:block_richtext.alignment",
  "blocks.item:block_richtext.translations.languages_code",
  "blocks.item:block_richtext.translations.tagline",
  "blocks.item:block_richtext.translations.headline",
  "blocks.item:block_richtext.translations.content",
  // block_posts
  "blocks.item:block_posts.id",
  "blocks.item:block_posts.collection",
  "blocks.item:block_posts.limit",
  "blocks.item:block_posts.translations.languages_code",
  "blocks.item:block_posts.translations.tagline",
  "blocks.item:block_posts.translations.headline",
  // block_products
  "blocks.item:block_products.id",
  "blocks.item:block_products.collection",
  "blocks.item:block_products.limit",
  "blocks.item:block_products.layout",
  "blocks.item:block_products.category",
  "blocks.item:block_products.sort_by",
  "blocks.item:block_products.show_price",
  "blocks.item:block_products.show_sku",
  "blocks.item:block_products.show_category_label",
  "blocks.item:block_products.card_style",
  "blocks.item:block_products.cta_url",
  "blocks.item:block_products.translations.*",
  // block_product_categories
  "blocks.item:block_product_categories.id",
  "blocks.item:block_product_categories.parent_category",
  "blocks.item:block_product_categories.depth",
  "blocks.item:block_product_categories.layout",
  "blocks.item:block_product_categories.show_product_count",
  "blocks.item:block_product_categories.translations.*",
];

const PAGE_BLOCK_JUNCTION_FIELDS = [
  "blocks.id",
  "blocks.sort",
  "blocks.collection",
  "blocks.hide_block",
  "blocks.background",
];

const PAGE_FIELDS = [
  "id",
  "title",
  "permalink",
  "seo",
  ...PAGE_BLOCK_JUNCTION_FIELDS,
  ...BLOCK_ITEM_FIELDS,
];

const SORT_MAP: Record<string, string[]> = {
  sort: ["sort"],
  date_created_desc: ["-date_created"],
  price_asc: ["price"],
  price_desc: ["-price"],
  name_asc: ["sort"], // true name sort needs translations deep-sort; approximated with sort field
};

// ─── Globals ──────────────────────────────────────────────────────────────────

export async function fetchGlobals(): Promise<Globals> {
  return directus.request(
    readSingleton("globals", {
      fields: [
        "title",
        "tagline",
        "description",
        "logo",
        "logo_dark_mode",
        "favicon",
        "url",
        "accent_color",
        "product_url_structure",
      ],
    }),
  ) as unknown as Globals;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function fetchPageByPermalink(permalink: string): Promise<Page | null> {
  const results = (await directus.request(
    readItems("pages", {
      filter: { permalink: { _eq: permalink }, status: { _eq: "published" } },
      fields: PAGE_FIELDS as any[],
      limit: 1,
    }),
  )) as unknown as Page[];
  return results[0] ?? null;
}

export async function fetchAllPages(): Promise<Pick<Page, "permalink" | "title">[]> {
  return directus.request(
    readItems("pages", {
      filter: { status: { _eq: "published" } },
      fields: ["permalink", "title"],
      sort: ["sort"] as any[],
    }),
  ) as unknown as Pick<Page, "permalink" | "title">[];
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function fetchPosts(limit = 6): Promise<Post[]> {
  return directus.request(
    readItems("posts", {
      filter: { status: { _eq: "published" } },
      fields: ["id", "slug", "image", "published_at", "translations.*"] as any[],
      sort: ["-published_at"] as any[],
      limit,
    }),
  ) as unknown as Post[];
}

export async function fetchPostsPagePermalink(): Promise<string | null> {
  const results = (await directus.request(
    readItems("page_blocks", {
      filter: { collection: { _eq: "block_posts" } },
      fields: ["page.permalink"] as any[],
      limit: 1,
    }),
  )) as unknown as { page: { permalink: string } }[];
  return results[0]?.page?.permalink ?? null;
}

export async function fetchAllPostSlugs(): Promise<{ slug: string }[]> {
  return directus.request(
    readItems("posts", {
      filter: { status: { _eq: "published" } },
      fields: ["slug"],
    }),
  ) as unknown as { slug: string }[];
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const results = (await directus.request(
    readItems("posts", {
      filter: { slug: { _eq: slug }, status: { _eq: "published" } },
      fields: ["id", "slug", "status", "image", "published_at", "translations.*"] as any[],
      limit: 1,
    }),
  )) as unknown as Post[];
  return results[0] ?? null;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchProductsPagePermalink(): Promise<string | null> {
  const results = (await directus.request(
    readItems("page_blocks", {
      filter: { collection: { _eq: "block_products" } },
      fields: ["page.permalink"] as any[],
      limit: 1,
    }),
  )) as unknown as { page: { permalink: string } }[];
  return results[0]?.page?.permalink ?? null;
}

export async function fetchAllProductSlugs(): Promise<
  { slug: string; category: { id: string } | null; translations: { languages_code: string; slug: string | null }[] }[]
> {
  return directus.request(
    readItems("products", {
      filter: { status: { _eq: "published" } },
      fields: ["slug", "category.id", "translations.languages_code", "translations.slug"] as any[],
      limit: -1,
    }),
  ) as unknown as { slug: string; category: { id: string } | null; translations: { languages_code: string; slug: string | null }[] }[];
}

export async function fetchProducts(
  limit = 6,
  categoryId?: string,
  sortBy?: string | null,
): Promise<Product[]> {
  const sort = SORT_MAP[sortBy ?? "sort"] ?? ["sort"];
  return directus.request(
    readItems("products", {
      filter: {
        status: { _eq: "published" },
        ...(categoryId ? { category: { _eq: categoryId } } : {}),
      } as any,
      fields: PRODUCT_CARD_FIELDS as any[],
      sort: sort as any[],
      limit,
    }),
  ) as unknown as Product[];
}

export async function fetchProductsByCategory(
  categoryIds: string[],
  limit = -1,
  sortBy?: string | null,
): Promise<Product[]> {
  const sort = SORT_MAP[sortBy ?? "sort"] ?? ["sort"];
  return directus.request(
    readItems("products", {
      filter: {
        status: { _eq: "published" },
        category: { _in: categoryIds },
      } as any,
      fields: PRODUCT_CARD_FIELDS as any[],
      sort: sort as any[],
      limit,
    }),
  ) as unknown as Product[];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const results = (await directus.request(
    readItems("products", {
      filter: { slug: { _eq: slug }, status: { _eq: "published" } },
      fields: [
        "id",
        "slug",
        "status",
        "sku",
        "price",
        "compare_at_price",
        "image",
        "gallery.directus_files_id",
        "product_type",
        "eclass_code",
        "eclass_version",
        "rfq_enabled",
        "rfq_min_quantity",
        "rfq_lead_time_days",
        "unit_quantity",
        "translations.*",
        // category + template cascade
        "category.id",
        "category.slug",
        "category.parent",
        "category.spec_layout",
        "category.listing_layout",
        "category.eclass_code",
        "category.eclass_version",
        "category.translations.languages_code",
        "category.translations.name",
        "category.translations.slug",
        ...PRODUCT_PAGE_TEMPLATE_FIELDS.map((f) => `category.default_page_template.${f}`),
        // product template
        ...PRODUCT_PAGE_TEMPLATE_FIELDS.map((f) => `page_template.${f}`),
        // brand
        "brand.id",
        "brand.slug",
        "brand.logo",
        "brand.website",
        "brand.translations.*",
        // unit
        "unit.id",
        "unit.code",
        "unit.symbol",
        "unit.translations.*",
        // variants
        "variants.id",
        "variants.status",
        "variants.sku",
        "variants.price",
        "variants.compare_at_price",
        "variants.stock",
        "variants.low_stock_threshold",
        "variants.image",
        "variants.options",
        "variants.translations.*",
        "variants.unit_override.id",
        "variants.unit_override.code",
        "variants.unit_override.symbol",
        "variants.unit_override.translations.*",
        // tags (M2M junction)
        "tags.product_tags_id.id",
        "tags.product_tags_id.slug",
        "tags.product_tags_id.translations.*",
        // related products (self-M2M junction)
        "related_products.related_products_id.id",
        "related_products.related_products_id.slug",
        "related_products.related_products_id.sku",
        "related_products.related_products_id.price",
        "related_products.related_products_id.compare_at_price",
        "related_products.related_products_id.image",
        "related_products.related_products_id.translations.*",
        // certifications (M2M junction)
        "certifications.obtained_at",
        "certifications.product_certifications_id.id",
        "certifications.product_certifications_id.certificate_number",
        "certifications.product_certifications_id.issuer",
        "certifications.product_certifications_id.issued_at",
        "certifications.product_certifications_id.expires_at",
        "certifications.product_certifications_id.document",
        "certifications.product_certifications_id.translations.*",
        // specs (O2M)
        "specs.id",
        "specs.sort",
        "specs.status",
        "specs.display_type",
        "specs.irdi",
        "specs.eclass_preferred_name",
        "specs.translations.*",
        "specs.group.id",
        "specs.group.icon",
        "specs.group.sort",
        "specs.group.irdi",
        "specs.group.translations.*",
        "specs.unit.id",
        "specs.unit.code",
        "specs.unit.symbol",
        "specs.unit.translations.*",
        // pricing tiers (O2M)
        "pricing_tiers.id",
        "pricing_tiers.status",
        "pricing_tiers.label",
        "pricing_tiers.min_quantity",
        "pricing_tiers.max_quantity",
        "pricing_tiers.price",
        "pricing_tiers.variant",
        "pricing_tiers.note",
        "pricing_tiers.customer_group.id",
        "pricing_tiers.customer_group.code",
        "pricing_tiers.customer_group.translations.*",
        // regional prices (O2M)
        "regional_prices.id",
        "regional_prices.status",
        "regional_prices.variant",
        "regional_prices.price",
        "regional_prices.compare_at_price",
        "regional_prices.region.id",
        "regional_prices.region.code",
        "regional_prices.region.name",
        "regional_prices.region.currency",
        // product page blocks M2A
        ...PAGE_BLOCK_JUNCTION_FIELDS,
        ...BLOCK_ITEM_FIELDS,
      ] as any[],
      limit: 1,
    }),
  )) as unknown as Product[];
  return results[0] ?? null;
}

// ─── Product categories ───────────────────────────────────────────────────────

export async function fetchAllCategories(): Promise<ProductCategory[]> {
  return directus.request(
    readItems("product_categories", {
      filter: { status: { _eq: "published" } },
      fields: [
        "id",
        "slug",
        "status",
        "image",
        "cover_image",
        "parent",
        "spec_layout",
        "listing_layout",
        "show_subcategories_bar",
        "eclass_code",
        "eclass_version",
        "translations.languages_code",
        "translations.name",
        "translations.slug",
      ] as any[],
      limit: -1,
    }),
  ) as unknown as ProductCategory[];
}

export async function fetchCategoryById(id: string): Promise<ProductCategory | null> {
  const CATEGORY_BLOCK_FIELDS = PAGE_BLOCK_JUNCTION_FIELDS.map((f) => f).concat([
    "blocks.position",
    ...BLOCK_ITEM_FIELDS,
  ]);

  const results = (await directus.request(
    readItems("product_categories", {
      filter: { id: { _eq: id }, status: { _eq: "published" } },
      fields: [
        "id",
        "slug",
        "status",
        "image",
        "cover_image",
        "parent",
        "spec_layout",
        "listing_layout",
        "show_subcategories_bar",
        "eclass_code",
        "eclass_version",
        "seo",
        "translations.*",
        ...PRODUCT_PAGE_TEMPLATE_FIELDS.map((f) => `default_page_template.${f}`),
        ...CATEGORY_BLOCK_FIELDS,
      ] as any[],
      limit: 1,
    }),
  )) as unknown as ProductCategory[];
  return results[0] ?? null;
}

export async function fetchCategoriesByParent(
  parentId: string | null,
): Promise<ProductCategory[]> {
  return directus.request(
    readItems("product_categories", {
      filter: {
        status: { _eq: "published" },
        parent: parentId ? { _eq: parentId } : { _null: true },
      } as any,
      fields: [
        "id",
        "slug",
        "status",
        "image",
        "cover_image",
        "parent",
        "translations.languages_code",
        "translations.name",
        "translations.slug",
        "translations.description",
      ] as any[],
      sort: ["sort"] as any[],
      limit: -1,
    }),
  ) as unknown as ProductCategory[];
}
