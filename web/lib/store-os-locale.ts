import type { Locale } from "@/lib/i18n";

export const STORE_OS_LOCALE_STORAGE_KEY = "uyao-store-locale";

export function parseStoreOsLocale(value: string | null): Locale {
  return value === "en" ? "en" : "zh";
}
