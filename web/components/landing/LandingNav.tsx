"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SHOP_URL } from "@/lib/shop";

type Locale = "zh" | "en";

type LandingNavProps = {
  locale: Locale;
  nav: [string, string, string];
  shop: string;
  pilot: string;
};

const NAV_ITEMS = [
  { href: "#message", index: 0 as const },
  { href: "#many", index: 1 as const },
  { href: "#jobs", index: 2 as const },
] as const;

/**
 * Company landing sticky nav. Desktop keeps inline section links; below `lg`
 * those links move into a hamburger disclosure so the bar stays one row.
 */
export function LandingNav({ locale, nav, shop, pilot }: LandingNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const shopUrl = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;
  const pilotHref = locale === "en" ? "/en/pharmacy" : "/zh-tw/pharmacy";
  const localeHref = locale === "en" ? "/zh-tw" : "/en";
  const localeLabel = locale === "en" ? "ZH" : "EN";
  const menuLabel = locale === "en" ? "Open menu" : "開啟選單";
  const closeLabel = locale === "en" ? "Close menu" : "關閉選單";
  const mobileNavLabel = locale === "en" ? "Page sections" : "頁面章節";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <nav
      ref={rootRef}
      className="sticky top-0 z-50 border-b border-line bg-ivory/95 backdrop-blur-sm"
      aria-label={locale === "en" ? "Primary" : "主要導覽"}
    >
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:h-[78px] sm:px-8">
        <Link
          href={locale === "en" ? "/en" : "/zh-tw"}
          className="flex min-h-11 items-center no-underline"
          onClick={() => setOpen(false)}
        >
          <BrandLogo height={34} />
        </Link>

        <div className="hidden items-center gap-7 text-[13px] lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="min-h-11 content-center no-underline hover:text-green"
            >
              {nav[item.index]}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle locale={locale} />
          <Link
            href={localeHref}
            className="num inline-flex min-h-11 items-center px-2 text-[11px] text-muted no-underline hover:text-green"
          >
            {localeLabel}
          </Link>
          <a
            href={shopUrl}
            className="inline-flex min-h-11 items-center border border-forest px-3 text-[12px] font-bold text-forest no-underline sm:px-4 sm:text-[13px]"
          >
            {shop}
          </a>
          <Link href={pilotHref} className="action-primary hidden text-[13px] sm:inline-flex">
            {pilot}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 flex-none items-center justify-center border border-line-strong bg-paper text-ink transition-[background-color,border-color] duration-200 hover:border-forest hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green lg:hidden"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? closeLabel : menuLabel}
            onClick={() => setOpen((current) => !current)}
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-line bg-ivory lg:hidden"
      >
        <div
          role="navigation"
          aria-label={mobileNavLabel}
          className="mx-auto flex max-w-[1240px] flex-col px-5 py-3 sm:px-8"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center border-b border-line text-[15px] no-underline hover:text-green"
              onClick={() => setOpen(false)}
            >
              {nav[item.index]}
            </a>
          ))}
          <Link
            href={pilotHref}
            className="action-primary mt-4 w-full text-[14px] sm:hidden"
            onClick={() => setOpen(false)}
          >
            {pilot}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-4" aria-hidden>
      <span
        className={`absolute left-0 top-0 block h-[1.5px] w-full bg-current transition-transform duration-200 ${
          open ? "translate-y-[6px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-[6px] block h-[1.5px] w-full bg-current transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 top-[12px] block h-[1.5px] w-full bg-current transition-transform duration-200 ${
          open ? "-translate-y-[6px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}
