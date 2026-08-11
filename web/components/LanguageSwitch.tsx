"use client";

import Link from "next/link";
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
    <Link
      href={`${targetPath}${query ? `?${query}` : ""}`}
      aria-label={locale === "en" ? "切換至繁體中文" : "Switch to English"}
      className={`inline-flex min-h-11 items-center px-2 text-xs font-bold text-muted no-underline hover:text-forest ${className}`}
    >
      {locale === "en" ? "ZH-TW" : "EN"}
    </Link>
  );
}
