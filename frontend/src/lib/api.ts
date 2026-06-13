import { readItems, readSingleton } from "@directus/sdk";
import { directus } from "./directus";
import type { Page, Globals, Post, Product, ProductCategory, Navigation } from "./directus";

// ─── Shared field sets ────────────────────────────────────────────────────────

// Layout block fields needed by ProductDetail.astro to decide which sections
// of the page to render. Only the fields actually consumed are fetched —
// other block_product_* collections are presence-checked via `collection`.
const PRODUCT_TEMPLATE_BLOCK_ITEM_FIELDS = [
  "tabs.blocks.id",
  "tabs.blocks.sort",
  "tabs.blocks.collection",
  "tabs.blocks.hide_block",
  "tabs.blocks.item:block_product_hero.id",
  "tabs.blocks.item:block_product_hero.show_breadcrumb",
  "tabs.blocks.item:block_product_card_grid.id",
  "tabs.blocks.item:block_product_card_grid.source",
  "tabs.blocks.item:block_product_gallery.id",
  "tabs.blocks.item:block_product_related.id",
  "tabs.blocks.item:block_product_content_slot.id",
  "tabs.blocks.item:block_product_pricing_table.id",
  "tabs.blocks.item:block_product_specs.id",
];

const PRODUCT_PAGE_TEMPLATE_FIELDS = [
  "id",
  "name",
  "tabs.id",
  "tabs.sort",
  ...PRODUCT_TEMPLATE_BLOCK_ITEM_FIELDS,
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
  // block_hero_slider
  "blocks.item:block_hero_slider.id",
  "blocks.item:block_hero_slider.status",
  "blocks.item:block_hero_slider.brand_logo",
  "blocks.item:block_hero_slider.brand_logo_link",
  "blocks.item:block_hero_slider.slides.id",
  "blocks.item:block_hero_slider.slides.sort",
  "blocks.item:block_hero_slider.slides.status",
  "blocks.item:block_hero_slider.slides.image",
  "blocks.item:block_hero_slider.slides.video",
  "blocks.item:block_hero_slider.slides.translations.languages_code",
  "blocks.item:block_hero_slider.slides.translations.tagline",
  "blocks.item:block_hero_slider.slides.translations.headline",
  "blocks.item:block_hero_slider.slides.translations.description",
  "blocks.item:block_hero_slider.slides.translations.cta_label",
  "blocks.item:block_hero_slider.slides.translations.cta_url",
  // block_features_grid
  "blocks.item:block_features_grid.id",
  "blocks.item:block_features_grid.status",
  "blocks.item:block_features_grid.layout",
  "blocks.item:block_features_grid.cta_url",
  "blocks.item:block_features_grid.image",
  "blocks.item:block_features_grid.image_link",
  "blocks.item:block_features_grid.translations.languages_code",
  "blocks.item:block_features_grid.translations.tagline",
  "blocks.item:block_features_grid.translations.headline",
  "blocks.item:block_features_grid.translations.description",
  "blocks.item:block_features_grid.translations.cta_label",
  "blocks.item:block_features_grid.translations.image_title",
  "blocks.item:block_features_grid.items.id",
  "blocks.item:block_features_grid.items.sort",
  "blocks.item:block_features_grid.items.image",
  "blocks.item:block_features_grid.items.link_url",
  "blocks.item:block_features_grid.items.translations.languages_code",
  "blocks.item:block_features_grid.items.translations.headline",
  "blocks.item:block_features_grid.items.translations.description",
  // block_numbered_list
  "blocks.item:block_numbered_list.id",
  "blocks.item:block_numbered_list.status",
  "blocks.item:block_numbered_list.cta_url",
  "blocks.item:block_numbered_list.image",
  "blocks.item:block_numbered_list.image_link",
  "blocks.item:block_numbered_list.layout",
  "blocks.item:block_numbered_list.translations.languages_code",
  "blocks.item:block_numbered_list.translations.tagline",
  "blocks.item:block_numbered_list.translations.headline",
  "blocks.item:block_numbered_list.translations.description",
  "blocks.item:block_numbered_list.translations.image_title",
  "blocks.item:block_numbered_list.items.id",
  "blocks.item:block_numbered_list.items.sort",
  "blocks.item:block_numbered_list.items.translations.languages_code",
  "blocks.item:block_numbered_list.items.translations.title",
  "blocks.item:block_numbered_list.items.translations.description",
  // block_brands_logos
  "blocks.item:block_brands_logos.id",
  "blocks.item:block_brands_logos.status",
  "blocks.item:block_brands_logos.image",
  "blocks.item:block_brands_logos.image_link",
  "blocks.item:block_brands_logos.translations.languages_code",
  "blocks.item:block_brands_logos.translations.tagline",
  "blocks.item:block_brands_logos.translations.headline",
  "blocks.item:block_brands_logos.translations.description",
  "blocks.item:block_brands_logos.translations.image_title",
  "blocks.item:block_brands_logos.logos.id",
  "blocks.item:block_brands_logos.logos.sort",
  "blocks.item:block_brands_logos.logos.image",
  "blocks.item:block_brands_logos.logos.name",
  "blocks.item:block_brands_logos.logos.url",
  // block_cta_banner
  "blocks.item:block_cta_banner.id",
  "blocks.item:block_cta_banner.status",
  "blocks.item:block_cta_banner.primary_cta_url",
  "blocks.item:block_cta_banner.secondary_cta_url",
  "blocks.item:block_cta_banner.translations.languages_code",
  "blocks.item:block_cta_banner.translations.tagline",
  "blocks.item:block_cta_banner.translations.headline",
  "blocks.item:block_cta_banner.translations.primary_cta_label",
  "blocks.item:block_cta_banner.translations.secondary_cta_label",
  // block_product_specs
  "blocks.item:block_product_specs.id",
  "blocks.item:block_product_specs.status",
  "blocks.item:block_product_specs.layout",
  "blocks.item:block_product_specs.spec_group",
  "blocks.item:block_product_specs.show_media",
  "blocks.item:block_product_specs.media_position",
  // block_product_category_cards
  "blocks.item:block_product_category_cards.id",
  "blocks.item:block_product_category_cards.status",
  "blocks.item:block_product_category_cards.brand_logo",
  "blocks.item:block_product_category_cards.translations.languages_code",
  "blocks.item:block_product_category_cards.translations.tagline",
  "blocks.item:block_product_category_cards.translations.headline",
  "blocks.item:block_product_category_cards.translations.description",
  "blocks.item:block_product_category_cards.translations.brand_label",
  "blocks.item:block_product_category_cards.cards.id",
  "blocks.item:block_product_category_cards.cards.sort",
  "blocks.item:block_product_category_cards.cards.category",
  "blocks.item:block_product_category_cards.cards.image",
  "blocks.item:block_product_category_cards.cards.video",
  "blocks.item:block_product_category_cards.cards.link_url",
  "blocks.item:block_product_category_cards.cards.translations.languages_code",
  "blocks.item:block_product_category_cards.cards.translations.title",
  "blocks.item:block_product_category_cards.cards.translations.subtitle",
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

// Status filter applied to all published-content queries. Omitted entirely in
// preview mode so draft/archived items resolve too.
function publishedFilter(preview: boolean): Record<string, unknown> {
  return preview ? {} : { status: { _eq: "published" } };
}

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
        "phone",
        "address",
        "email",
        "footer_image",
        "social_links",
      ],
    }),
  ) as unknown as Globals;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function fetchPageByPermalink(permalink: string, preview = false): Promise<Page | null> {
  const results = (await directus.request(
    readItems("pages", {
      filter: { permalink: { _eq: permalink }, ...publishedFilter(preview) } as any,
      fields: PAGE_FIELDS as any[],
      limit: 1,
    }),
  )) as unknown as Page[];
  return results[0] ?? null;
}

export async function fetchAllPages(preview = false): Promise<Pick<Page, "permalink" | "title">[]> {
  return directus.request(
    readItems("pages", {
      filter: publishedFilter(preview) as any,
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

export async function fetchPostBySlug(slug: string, preview = false): Promise<Post | null> {
  const results = (await directus.request(
    readItems("posts", {
      filter: { slug: { _eq: slug }, ...publishedFilter(preview) } as any,
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

export async function fetchAllProductSlugs(
  preview = false,
): Promise<
  { slug: string; category: { id: string } | null; translations: { languages_code: string; slug: string | null }[] }[]
> {
  return directus.request(
    readItems("products", {
      filter: publishedFilter(preview) as any,
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
  preview = false,
): Promise<Product[]> {
  const sort = SORT_MAP[sortBy ?? "sort"] ?? ["sort"];
  return directus.request(
    readItems("products", {
      filter: {
        ...publishedFilter(preview),
        _or: [
          { category: { _in: categoryIds } },
          { additional_categories: { product_categories_id: { _in: categoryIds } } },
        ],
      } as any,
      fields: PRODUCT_CARD_FIELDS as any[],
      sort: sort as any[],
      limit,
    }),
  ) as unknown as Product[];
}

export async function fetchProductBySlug(slug: string, preview = false): Promise<Product | null> {
  const results = (await directus.request(
    readItems("products", {
      filter: { slug: { _eq: slug }, ...publishedFilter(preview) } as any,
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
        "category.listing_layout",
        "category.eclass_code",
        "category.eclass_version",
        "category.translations.languages_code",
        "category.translations.name",
        "category.translations.slug",
        ...PRODUCT_PAGE_TEMPLATE_FIELDS.map((f) => `category.default_page_template.${f}`),
        // additional categories (M2M — drives extra listing memberships, not the canonical URL)
        "additional_categories.product_categories_id.id",
        "additional_categories.product_categories_id.slug",
        "additional_categories.product_categories_id.parent",
        "additional_categories.product_categories_id.translations.languages_code",
        "additional_categories.product_categories_id.translations.name",
        "additional_categories.product_categories_id.translations.slug",
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
        // spec variant values — nested under each spec via O2M backlink
        "specs.spec_variant_values.variant",
        "specs.spec_variant_values.value",
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
        // media (O2M) — generic tagged assets (engineering drawings, etc.)
        "media.id",
        "media.sort",
        "media.status",
        "media.image",
        "media.purpose",
        "media.position",
        "media.translations.languages_code",
        "media.translations.caption",
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

export async function fetchAllCategories(preview = false): Promise<ProductCategory[]> {
  return directus.request(
    readItems("product_categories", {
      filter: publishedFilter(preview) as any,
      fields: [
        "id",
        "slug",
        "status",
        "image",
        "cover_image",
        "parent",
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

export async function fetchCategoryById(id: string, preview = false): Promise<ProductCategory | null> {
  const CATEGORY_BLOCK_FIELDS = PAGE_BLOCK_JUNCTION_FIELDS.map((f) => f).concat([
    "blocks.position",
    ...BLOCK_ITEM_FIELDS,
  ]);

  const results = (await directus.request(
    readItems("product_categories", {
      filter: { id: { _eq: id }, ...publishedFilter(preview) } as any,
      fields: [
        "id",
        "slug",
        "status",
        "image",
        "cover_image",
        "parent",
        "listing_layout",
        "show_subcategories_bar",
        "eclass_code",
        "eclass_version",
        "seo",
        "translations.*",
        "brand.id",
        "brand.slug",
        "brand.logo",
        "brand.translations.*",
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

// ─── Navigation ───────────────────────────────────────────────────────────────

export async function fetchNavigation(id: string): Promise<Navigation | null> {
  const results = (await directus.request(
    readItems("navigation", {
      filter: { id: { _eq: id }, is_active: { _eq: true } },
      fields: [
        "id",
        "title",
        "is_active",
        "items.id",
        "items.title",
        "items.type",
        "items.url",
        "items.sort",
        "items.children.id",
        "items.children.title",
        "items.children.type",
        "items.children.url",
        "items.children.sort",
      ] as any[],
      limit: 1,
    }),
  )) as unknown as Navigation[];
  return results[0] ?? null;
}
