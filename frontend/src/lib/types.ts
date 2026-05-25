export type Language = {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
};

export type ProductUrlStructure = "category_prefixed" | "parent_prefixed" | "root_prefixed" | "flat";

export type Globals = {
  title: string | null;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  logo_dark_mode: string | null;
  favicon: string | null;
  url: string | null;
  accent_color: string | null;
  default_currency: string | null;
  product_url_structure: ProductUrlStructure | null;
};

// ─── Block types ────────────────────────────────────────────────────────────

export type BlockHeroTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
};

export type BlockHero = {
  id: string;
  image: string | null;
  layout: "image_left" | "image_center" | "image_right" | null;
  translations: BlockHeroTranslation[];
};

export type BlockRichtextTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  content: string | null;
};

export type BlockRichtext = {
  id: string;
  alignment: "left" | "center" | null;
  translations: BlockRichtextTranslation[];
};

export type BlockPostsTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
};

export type BlockPosts = {
  id: string;
  collection: "posts";
  limit: number;
  translations: BlockPostsTranslation[];
};

export type BlockProductsTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  cta_label: string | null;
};

export type BlockProducts = {
  id: string;
  collection: "products";
  limit: number;
  layout: "grid_2" | "grid_3" | "grid_4" | "list" | null;
  category: string | null;
  sort_by: "sort" | "date_created_desc" | "price_asc" | "price_desc" | "name_asc" | null;
  show_price: boolean;
  show_sku: boolean;
  show_category_label: boolean;
  card_style: string | null;
  cta_url: string | null;
  translations: BlockProductsTranslation[];
};

export type BlockProductCategoriesTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
};

export type BlockProductCategories = {
  id: string;
  parent_category: string | null;
  depth: number;
  layout: "grid_2" | "grid_3" | "grid_4" | "list" | null;
  show_product_count: boolean;
  translations: BlockProductCategoriesTranslation[];
};

// ─── Post ────────────────────────────────────────────────────────────────────

export type PostTranslation = {
  languages_code: string;
  title: string | null;
  description: string | null;
  content: string | null;
};

export type Post = {
  id: string;
  slug: string;
  status: string;
  image: string | null;
  published_at: string | null;
  translations: PostTranslation[];
};

// ─── Product catalog ─────────────────────────────────────────────────────────

export type ProductUnit = {
  id: string;
  code: string;
  symbol: string;
  translations: {
    languages_code: string;
    name_singular: string;
    name_plural: string | null;
    abbreviation: string | null;
  }[];
};

export type ProductBrand = {
  id: string;
  slug: string;
  logo: string | null;
  website: string | null;
  translations: { languages_code: string; name: string; description: string | null }[];
};

export type ProductTag = {
  id: string;
  slug: string;
  translations: { languages_code: string; name: string }[];
};

export type ProductSpecGroup = {
  id: string;
  icon: string | null;
  sort: number | null;
  irdi: string | null;
  translations: { languages_code: string; name: string; note: string | null }[];
};

export type ProductSpec = {
  id: string;
  sort: number | null;
  status: string;
  group: ProductSpecGroup | null;
  unit: ProductUnit | null;
  display_type: "text" | "boolean" | "number" | "range" | "list" | null;
  irdi: string | null;
  eclass_preferred_name: string | null;
  translations: { languages_code: string; label: string; value: string; note: string | null }[];
};

export type ProductCertification = {
  id: string;
  certificate_number: string | null;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document: string | null;
  translations: { languages_code: string; name: string; description: string | null }[];
};

export type CustomerGroup = {
  id: string;
  code: string;
  translations: { languages_code: string; name: string }[];
};

export type ProductPricingTier = {
  id: string;
  status: string;
  label: string | null;
  min_quantity: number | null;
  max_quantity: number | null;
  price: number | null;
  variant: string | null;
  customer_group: CustomerGroup | null;
  note: string | null;
};

export type ProductRegion = {
  id: string;
  code: string;
  name: string;
  currency: string;
};

export type ProductRegionalPrice = {
  id: string;
  status: string;
  region: ProductRegion;
  variant: string | null;
  price: number | null;
  compare_at_price: number | null;
};

export type ProductPageSection =
  | "gallery"
  | "price"
  | "variants"
  | "specs"
  | "certifications"
  | "pricing_table"
  | "related"
  | "description"
  | "content_blocks"
  | "brand"
  | "sku";

export type ProductPageTemplate = {
  id: string;
  name: string;
  gallery_layout: "thumbnails" | "carousel" | "grid";
  spec_layout: "table" | "accordion" | "comparison";
  show_breadcrumb: boolean;
  sections: { section: ProductPageSection; enabled: boolean }[];
};

export type ProductCategoryTranslation = {
  languages_code: string;
  name: string | null;
  description: string | null;
  slug: string | null;
};

export type ProductCategory = {
  id: string;
  slug: string;
  status: string;
  image: string | null;
  cover_image: string | null;
  parent: string | null;
  spec_layout: string | null;
  listing_layout: string | null;
  show_subcategories_bar: boolean;
  eclass_code: string | null;
  eclass_version: string | null;
  seo: Record<string, unknown> | null;
  translations: ProductCategoryTranslation[];
  default_page_template: ProductPageTemplate | null;
  blocks: CategoryPageBlock[] | null;
};

export type CategoryPageBlock = {
  id: string;
  sort: number | null;
  collection: string;
  hide_block: boolean;
  background: "light" | "dark";
  position: "above" | "below";
  item: Record<string, unknown>;
};

export type ProductVariantTranslation = {
  languages_code: string;
  name: string | null;
};

export type ProductVariant = {
  id: string;
  status: string;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  image: string | null;
  options: { attribute: string; value: string }[] | null;
  translations: ProductVariantTranslation[];
  low_stock_threshold: number | null;
  reorder_point: number | null;
  reorder_quantity: number | null;
  unit_override: ProductUnit | null;
};

export type ProductTranslation = {
  languages_code: string;
  name: string | null;
  description: string | null;
  content: string | null;
  slug: string | null;
};

export type ProductCategoryRef = {
  id: string;
  slug: string;
  parent: string | null;
  spec_layout: string | null;
  listing_layout: string | null;
  eclass_code: string | null;
  eclass_version: string | null;
  translations: { languages_code: string; name: string | null; slug: string | null }[];
  default_page_template: ProductPageTemplate | null;
};

export type Product = {
  id: string;
  slug: string;
  status: string;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  image: string | null;
  gallery: { directus_files_id: string }[] | null;
  product_type: "standard" | "consumable" | "service" | "configurable" | null;
  eclass_code: string | null;
  eclass_version: string | null;
  rfq_enabled: boolean;
  rfq_min_quantity: number | null;
  rfq_lead_time_days: number | null;
  unit: ProductUnit | null;
  unit_quantity: number | null;
  brand: ProductBrand | null;
  category: ProductCategoryRef | null;
  translations: ProductTranslation[];
  variants: ProductVariant[];
  tags: { product_tags_id: ProductTag }[];
  related_products: { related_products_id: Pick<Product, "id" | "slug" | "sku" | "price" | "compare_at_price" | "image" | "translations"> }[];
  certifications: { product_certifications_id: ProductCertification; obtained_at: string | null }[];
  specs: ProductSpec[];
  pricing_tiers: ProductPricingTier[];
  regional_prices: ProductRegionalPrice[];
  page_template: ProductPageTemplate | null;
  blocks: PageBlock[] | null;
};

// ─── Page builder ─────────────────────────────────────────────────────────────

export type PageBlock = {
  id: string;
  sort: number | null;
  collection: "block_hero" | "block_richtext" | "block_posts" | "block_products" | "block_product_categories" | string;
  hide_block: boolean;
  background: "light" | "dark";
  item: BlockHero | BlockRichtext | BlockPosts | BlockProducts | BlockProductCategories | Record<string, unknown>;
};

export type Page = {
  id: string;
  title: string;
  permalink: string;
  status: string;
  seo: Record<string, unknown> | null;
  blocks: PageBlock[];
};

// ─── Directus schema map ──────────────────────────────────────────────────────

export type Schema = {
  languages: Language[];
  globals: Globals;
  pages: Page[];
  page_blocks: PageBlock[];
  block_hero: BlockHero[];
  block_richtext: BlockRichtext[];
  block_posts: BlockPosts[];
  posts: Post[];
  block_products: BlockProducts[];
  block_product_categories: BlockProductCategories[];
  products: Product[];
  product_variants: ProductVariant[];
  product_categories: ProductCategory[];
  product_page_templates: ProductPageTemplate[];
  product_units: ProductUnit[];
  product_brands: ProductBrand[];
  product_tags: ProductTag[];
  product_certifications: ProductCertification[];
  product_spec_groups: ProductSpecGroup[];
  product_specs: ProductSpec[];
  product_pricing_tiers: ProductPricingTier[];
  customer_groups: CustomerGroup[];
  product_regions: ProductRegion[];
  product_regional_prices: ProductRegionalPrice[];
};
