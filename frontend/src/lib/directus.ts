import { createDirectus, rest, authentication } from "@directus/sdk";
import type { Schema } from "./types";

export const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";

export const directus = createDirectus<Schema>(DIRECTUS_URL).with(authentication()).with(rest());

export type { Schema } from "./types";
export type {
  Language,
  Globals,
  ProductUrlStructure,
  BlockHeroTranslation,
  BlockHero,
  BlockRichtextTranslation,
  BlockRichtext,
  BlockPostsTranslation,
  BlockPosts,
  BlockProductsTranslation,
  BlockProducts,
  BlockProductCategoriesTranslation,
  BlockProductCategories,
  PostTranslation,
  Post,
  ProductUnit,
  ProductBrand,
  ProductTag,
  ProductSpecGroup,
  ProductSpec,
  ProductCertification,
  CustomerGroup,
  ProductPricingTier,
  ProductRegion,
  ProductRegionalPrice,
  ProductPageSection,
  ProductPageTemplate,
  ProductCategoryTranslation,
  ProductCategory,
  ProductCategoryRef,
  CategoryPageBlock,
  ProductVariantTranslation,
  ProductVariant,
  ProductTranslation,
  Product,
  PageBlock,
  Page,
} from "./types";
