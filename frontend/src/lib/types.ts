export type Language = {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
};

export type ProductUrlStructure = "category_prefixed" | "parent_prefixed" | "root_prefixed" | "flat";

export type SocialLink = {
  service: "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "vimeo" | "github" | "discord" | "docker";
  url: string;
};

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
  phone: string | null;
  address: string | null;
  email: string | null;
  footer_image: string | null;
  social_links: SocialLink[] | null;
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

// ─── New block types ─────────────────────────────────────────────────────────

export type BlockHeroSliderSlideTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

export type BlockHeroSliderSlide = {
  id: string;
  sort: number | null;
  status: string;
  image: string | null;
  video: string | null;
  translations: BlockHeroSliderSlideTranslation[];
};

export type BlockHeroSlider = {
  id: string;
  status: string;
  brand_logo: string | null;
  brand_logo_link: string | null;
  slides: BlockHeroSliderSlide[];
};

export type BlockFeaturesGridTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
  cta_label: string | null;
  image_title: string | null;
};

export type BlockFeaturesGridItemTranslation = {
  languages_code: string;
  headline: string | null;
  description: string | null;
};

export type BlockFeaturesGridItem = {
  id: string;
  sort: number | null;
  image: string | null;
  link_url: string | null;
  translations: BlockFeaturesGridItemTranslation[];
};

export type BlockFeaturesGrid = {
  id: string;
  status: string;
  layout: "grid_2" | "grid_3" | "grid_4" | "showcase_left" | "showcase_right" | null;
  cta_url: string | null;
  image: string | null;
  image_link: string | null;
  translations: BlockFeaturesGridTranslation[];
  items: BlockFeaturesGridItem[];
};

export type BlockNumberedListTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
  image_title: string | null;
};

export type BlockNumberedListItemTranslation = {
  languages_code: string;
  title: string | null;
  description: string | null;
};

export type BlockNumberedListItem = {
  id: string;
  sort: number | null;
  translations: BlockNumberedListItemTranslation[];
};

export type BlockNumberedList = {
  id: string;
  status: string;
  cta_url: string | null;
  image: string | null;
  image_link: string | null;
  layout: "image_left" | "image_right" | null;
  translations: BlockNumberedListTranslation[];
  items: BlockNumberedListItem[];
};

export type BlockProductSpecs = {
  id: string;
  status: string;
  layout:
    | "table"
    | "accordion"
    | "comparison_table"
    | "comparison_accordion"
    | "numbered_list"
    | "feature_grid"
    | null;
  spec_group: string | null;
  show_media: boolean;
  media_position: "left" | "right" | "both" | null;
};

// ─── Product page layout blocks ──────────────────────────────────────────────

export type BlockProductHero = {
  id: string;
  status: string;
  show_breadcrumb: boolean;
};

export type BlockProductCardGrid = {
  id: string;
  status: string;
  source: "highlights" | "capabilities" | "certifications" | "options" | "custom_items";
};

export type ProductTemplateBlock = {
  id: string;
  sort: number | null;
  collection: string;
  hide_block: boolean;
  item:
    | BlockProductHero
    | BlockProductCardGrid
    | BlockProductSpecs
    | Record<string, unknown>;
};

export type BlockBrandLogosTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
  image_title: string | null;
};

export type BlockBrandLogosItem = {
  id: string;
  sort: number | null;
  image: string | null;
  name: string | null;
  url: string | null;
};

export type BlockBrandLogos = {
  id: string;
  status: string;
  image: string | null;
  image_link: string | null;
  translations: BlockBrandLogosTranslation[];
  logos: BlockBrandLogosItem[];
};

export type BlockCtaBannerTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  primary_cta_label: string | null;
  secondary_cta_label: string | null;
};

export type BlockCtaBanner = {
  id: string;
  status: string;
  primary_cta_url: string | null;
  secondary_cta_url: string | null;
  translations: BlockCtaBannerTranslation[];
};

export type BlockProductCategoryCardsTranslation = {
  languages_code: string;
  tagline: string | null;
  headline: string | null;
  description: string | null;
  brand_label: string | null;
};

export type BlockProductCategoryCardsItemTranslation = {
  languages_code: string;
  title: string | null;
  subtitle: string | null;
};

export type BlockProductCategoryCardsItem = {
  id: string;
  sort: number | null;
  category: string | null;
  image: string | null;
  video: string | null;
  link_url: string | null;
  translations: BlockProductCategoryCardsItemTranslation[];
};

export type BlockProductCategoryCards = {
  id: string;
  status: string;
  brand_logo: string | null;
  translations: BlockProductCategoryCardsTranslation[];
  cards: BlockProductCategoryCardsItem[];
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

// Catalog-wide, ungated — no product/category ownership and no scoping
// mechanism. A group is simply attached wherever a variant uses it via
// product_variant_spec_groups (see ProductVariantSpecGroup below).
export type ProductSpecGroup = {
  id: string;
  icon: string | null;
  sort: number | null;
  irdi: string | null;
  translations: { languages_code: string; name: string; note: string | null }[];
};

// Canonical, catalog-wide spec definition. No product or variant ownership
// column and no base/default value — every value is entered per variant via
// ProductSpecVariantValue, reached through ProductVariantSpecGroup.
export type ProductSpec = {
  id: string;
  sort: number | null;
  status: string;
  group: ProductSpecGroup | null;
  unit: ProductUnit | null;
  display_type: "text" | "boolean" | "number" | "range" | "list" | null;
  irdi: string | null;
  eclass_preferred_name: string | null;
  translations: { languages_code: string; label: string; note: string | null }[];
};

// One cell — this variant's value for one spec. Reached only through its
// parent ProductVariantSpecGroup; no `variant` column on this row itself.
export type ProductSpecVariantValue = {
  id: string;
  sort: number | null;
  value: string;
  spec: ProductSpec;
};

// Per-variant instance of a spec group — "this variant has values for this
// group." The real entry point/door for all spec data (see schema guide §6).
export type ProductVariantSpecGroup = {
  id: string;
  sort: number | null;
  spec_group: ProductSpecGroup;
  variant_spec_values: ProductSpecVariantValue[];
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

export type ProductPageTabTranslation = {
  languages_code: string;
  label: string;
};

export type ProductPageTab = {
  id: string;
  key: string;
  icon: string | null;
  sort: number | null;
  translations: ProductPageTabTranslation[];
  blocks: ProductTemplateBlock[];
};

export type ProductPageTemplate = {
  id: string;
  name: string;
  tabs: ProductPageTab[];
};

export type ProductCategoryTranslation = {
  languages_code: string;
  name: string | null;
  description: string | null;
  slug: string | null;
  tagline: string | null;
  model_list: string | null;
};

export type ProductCategory = {
  id: string;
  slug: string;
  status: string;
  image: string | null;
  cover_image: string | null;
  parent: string | null;
  listing_layout: string | null;
  show_subcategories_bar: boolean;
  eclass_code: string | null;
  eclass_version: string | null;
  seo: Record<string, unknown> | null;
  brand: ProductBrand | null;
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
  variant_spec_groups: ProductVariantSpecGroup[];
};

export type ProductTranslation = {
  languages_code: string;
  name: string | null;
  description: string | null;
  content: string | null;
  slug: string | null;
  tagline: string | null;
  model_range: string | null;
};

export type ProductMediaTranslation = {
  languages_code: string;
  caption: string | null;
};

export type ProductMedia = {
  id: string;
  sort: number | null;
  status: string;
  image: string | null;
  purpose: string;
  position: "left" | "right" | "center" | null;
  translations: ProductMediaTranslation[];
};

export type ProductCategoryRef = {
  id: string;
  slug: string;
  parent: string | null;
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
  additional_categories: { product_categories_id: ProductCategoryRef }[];
  translations: ProductTranslation[];
  variants: ProductVariant[];
  tags: { product_tags_id: ProductTag }[];
  related_products: {
    related_products_id: Pick<Product, "id" | "slug" | "sku" | "price" | "compare_at_price" | "image" | "translations"> & {
      category: Pick<ProductCategoryRef, "id"> | null;
    };
  }[];
  certifications: { product_certifications_id: ProductCertification; obtained_at: string | null }[];
  pricing_tiers: ProductPricingTier[];
  regional_prices: ProductRegionalPrice[];
  media: ProductMedia[];
  page_template: ProductPageTemplate | null;
  blocks: PageBlock[] | null;
};

// ─── Page builder ─────────────────────────────────────────────────────────────

export type PageBlock = {
  id: string;
  sort: number | null;
  collection:
    | "block_hero"
    | "block_richtext"
    | "block_posts"
    | "block_products"
    | "block_product_categories"
    | "block_hero_slider"
    | "block_features_grid"
    | "block_numbered_list"
    | "block_brands_logos"
    | "block_cta_banner"
    | "block_product_category_cards"
    | "block_product_specs"
    | string;
  hide_block: boolean;
  background: "light" | "dark";
  item:
    | BlockHero
    | BlockRichtext
    | BlockPosts
    | BlockProducts
    | BlockProductCategories
    | BlockHeroSlider
    | BlockFeaturesGrid
    | BlockNumberedList
    | BlockBrandLogos
    | BlockCtaBanner
    | BlockProductCategoryCards
    | BlockProductSpecs
    | Record<string, unknown>;
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

export type Navigation = {
  id: string;
  title: string | null;
  is_active: boolean;
  items: NavigationItem[];
};

export type NavigationItem = {
  id: string;
  title: string | null;
  type: "page" | "post" | "url" | "group" | null;
  url: string | null;
  sort: number | null;
  children: NavigationItem[];
};

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
  block_hero_slider: BlockHeroSlider[];
  block_features_grid: BlockFeaturesGrid[];
  block_numbered_list: BlockNumberedList[];
  block_brands_logos: BlockBrandLogos[];
  block_cta_banner: BlockCtaBanner[];
  block_product_category_cards: BlockProductCategoryCards[];
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
  product_spec_variant_values: ProductSpecVariantValue[];
  product_pricing_tiers: ProductPricingTier[];
  customer_groups: CustomerGroup[];
  product_regions: ProductRegion[];
  product_regional_prices: ProductRegionalPrice[];
  navigation: Navigation[];
  navigation_items: NavigationItem[];
};
