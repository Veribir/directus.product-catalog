import { readItems } from "@directus/sdk";
import { directus, type Language } from "./directus";

export type { Language };

export const DEFAULT_LOCALE = "en-US";

// In-process cache so getStaticPaths() only hits Directus once per build.
let _languages: Language[] | null = null;

export async function getLanguages(): Promise<Language[]> {
  if (_languages) return _languages;
  _languages = await directus.request(readItems("languages"));
  return _languages;
}

export function getDefaultLanguage(languages: Language[]): Language {
  return languages.find((l) => l.code === DEFAULT_LOCALE) ?? languages[0];
}

/**
 * Picks the right translation from a Directus `_translations` array.
 * Falls back to DEFAULT_LOCALE, then to the first available entry.
 *
 * Usage:
 *   const post = await directus.request(readItem("posts", id, { fields: ["*", "translations.*"] }));
 *   const tx = getTranslation(post.translations, "fr-FR");
 *   tx.title // → French title
 */
export function getTranslation<T extends { languages_code: string }>(
  translations: T[],
  locale: string,
): T {
  return (
    translations.find((t) => t.languages_code === locale) ??
    translations.find((t) => t.languages_code === DEFAULT_LOCALE) ??
    translations[0]
  );
}
