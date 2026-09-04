"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { AreaSwitch } from "./AreaSwitch";
import { localizedPath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";
import type { AreaSlug } from "@/lib/types";

type SiteHeaderMobileMenuProps = {
  locale: "zh" | "en";
  area: AreaSlug;
  preserveAreaPath: boolean;
  locatable: boolean;
  tone: "default" | "cabinet";
  activeWorkspace?: "shop" | "agent";
  showPharmacyCta: boolean;
};

/**
 * Mobile disclosure for destinations / area / pharmacy CTA that do not fit
 * the compact Shop header row. Desktop keeps those controls inline.
 */
export function SiteHeaderMobileMenu({
  locale,
  area,
  preserveAreaPath,
  locatable,
  tone,
  activeWorkspace,
  showPharmacyCta,
}: SiteHeaderMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const cabinetTone = tone === "cabinet";
  const menuLabel = locale === "en" ? "Open menu" : "開啟選單";
  const closeLabel = locale === "en" ? "Close menu" : "關閉選單";
  const destinationsLabel = locale === "en" ? "uYao destinations" : "uYao 主要導覽";
  const showWorkspace = Boolean(activeWorkspace);

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
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        className={`inline-flex h-11 w-11 flex-none items-center justify-center border transition-[background-color,border-color,color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          cabinetTone
            ? "border-transparent bg-transparent text-paper hover:bg-paper/12 hover:text-white focus-visible:outline-paper"
            : "border-line-strong bg-paper text-ink hover:border-forest hover:bg-surface focus-visible:outline-green"
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : menuLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <HamburgerIcon open={open} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="site-header-mobile-panel absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18.5rem,calc(100vw-1.5rem))] border border-line-strong bg-paper text-ink shadow-[0_16px_40px_rgba(28,39,34,0.16)]"
      >
        {showWorkspace && (
          <nav aria-label={destinationsLabel} className="flex flex-col border-b border-line-strong">
            <Link
              href={localizedPath("/", locale)}
              aria-current={activeWorkspace === "shop" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-4 text-[14px] no-underline ${
                activeWorkspace === "shop"
                  ? "bg-surface font-bold text-forest"
                  : "font-semibold text-muted hover:bg-surface hover:text-ink"
              }`}
              onClick={() => setOpen(false)}
            >
              Shop
            </Link>
            <Link
              href={localizedPath("/agent", locale)}
              aria-current={activeWorkspace === "agent" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-4 text-[14px] no-underline ${
                activeWorkspace === "agent"
                  ? "bg-surface font-bold text-forest"
                  : "font-semibold text-muted hover:bg-surface hover:text-ink"
              }`}
              onClick={() => setOpen(false)}
            >
              Agent
            </Link>
          </nav>
        )}

        <div className="border-b border-line-strong px-4 py-3">
          <AreaSwitch area={area} preservePath={preserveAreaPath} locatable={locatable} compact />
        </div>

        {showPharmacyCta && (
          <div className="p-3">
            <Link
              href={`${SITE_URL}${localizedPath("/pharmacy", locale)}`}
              className="inline-flex min-h-11 w-full items-center justify-center border border-line-strong bg-paper px-3 text-xs font-bold text-forest no-underline transition-colors hover:border-forest hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              {locale === "en" ? "For pharmacies" : "我是藥局"}
            </Link>
          </div>
        )}
      </div>
    </div>
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
