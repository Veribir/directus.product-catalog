import type { ProductPricingTier, ProductRegionalPrice, ProductUnit } from "./types";

// ─── Basic formatting ─────────────────────────────────────────────────────────

// Directus returns decimal columns as strings — coerce before formatting.
export function formatPrice(
  value: number | string | null | undefined,
  locale = "en-US",
  currency = "USD",
): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}

export function isOnSale(
  price: number | string | null | undefined,
  compareAt: number | string | null | undefined,
): boolean {
  if (price == null || compareAt == null) return false;
  return Number(compareAt) > Number(price);
}

// ─── Pricing tier resolution ──────────────────────────────────────────────────

/**
 * Resolves the best matching pricing tier for a given product/variant/quantity/group context.
 * Priority: variant-specific > product-wide, group-specific > group-null, highest min_quantity first.
 * Returns null if no tier matches — caller falls back to base price.
 */
export function resolveTierPrice(
  tiers: ProductPricingTier[],
  variantId: string | null,
  quantity: number,
  customerGroupId?: string | null,
): ProductPricingTier | null {
  const published = tiers.filter((t) => t.status === "published");

  const matching = published.filter((t) => {
    const variantMatch = t.variant === null || t.variant === variantId;
    const minOk = t.min_quantity == null || quantity >= t.min_quantity;
    const maxOk = t.max_quantity == null || quantity <= t.max_quantity;
    const groupMatch =
      t.customer_group === null ||
      (customerGroupId && t.customer_group.id === customerGroupId);
    return variantMatch && minOk && maxOk && groupMatch;
  });

  if (matching.length === 0) return null;

  // Sort: variant-specific first, then group-specific, then highest min_quantity
  matching.sort((a, b) => {
    const aVariant = a.variant !== null ? 1 : 0;
    const bVariant = b.variant !== null ? 1 : 0;
    if (bVariant !== aVariant) return bVariant - aVariant;
    const aGroup = a.customer_group !== null ? 1 : 0;
    const bGroup = b.customer_group !== null ? 1 : 0;
    if (bGroup !== aGroup) return bGroup - aGroup;
    return (b.min_quantity ?? 0) - (a.min_quantity ?? 0);
  });

  return matching[0];
}

// ─── Regional price resolution ────────────────────────────────────────────────

/**
 * Returns the regional price for a given region code and optional variant.
 * Falls back to null (caller uses base product price).
 */
export function resolveRegionalPrice(
  regionalPrices: ProductRegionalPrice[],
  regionCode: string | null | undefined,
  variantId?: string | null,
): ProductRegionalPrice | null {
  if (!regionCode) return null;
  const published = regionalPrices.filter((r) => r.status === "published");

  // Prefer variant-specific, fall back to product-wide
  const variantMatch = variantId
    ? published.find((r) => r.region.code === regionCode && r.variant === variantId)
    : null;
  if (variantMatch) return variantMatch;

  return published.find((r) => r.region.code === regionCode && r.variant === null) ?? null;
}

// ─── Unit display ─────────────────────────────────────────────────────────────

/**
 * Returns the display abbreviation for a unit in a given locale.
 * Falls back to symbol → code.
 */
export function formatUnit(unit: ProductUnit | null | undefined, locale = "en-US"): string | null {
  if (!unit) return null;
  const tx =
    unit.translations.find((t) => t.languages_code === locale) ??
    unit.translations.find((t) => t.languages_code === "en-US");
  return tx?.abbreviation || unit.symbol || unit.code;
}
