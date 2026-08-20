"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { useLocale } from "./LocaleProvider";
import { localizedPath } from "@/lib/i18n";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname.replace(/^\/(?:en|zh-tw)(?=\/|$)/, "") || "/";
  const targetPath = localizedPath(basePath, locale === "en" ? "zh" : "en");
  const query = searchParams.toString();

  return (
    // Both locale URLs rewrite to the same internal consumer route. A full
    // navigation ensures the root locale provider is rebuilt for the target
    // language instead of being preserved by Next.js client navigation.
    <a
      href={`${targetPath}${query ? `?${query}` : ""}`}
      aria-label={locale === "en" ? "切換至繁體中文" : "Switch to English"}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-bold text-muted no-underline hover:text-forest ${className}`}
    >
      {locale === "en" ? "ZH-TW" : "EN"}
    </a>
  );
}
