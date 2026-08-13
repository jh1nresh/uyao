"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PartnerStoreItem } from "@/lib/partner-stores";

const COPY = {
  zh: {
    headingSuffix: "家合作藥局據點",
    evidence: "查看合作與證據 →",
    ariaLabel: "合作藥局據點",
  },
  en: {
    headingSuffix: "partner pharmacy locations",
    evidence: "Partnership evidence →",
    ariaLabel: "Partner pharmacy locations",
  },
} as const;

function MarqueeList({
  items,
  duplicate = false,
}: {
  items: readonly PartnerStoreItem[];
  duplicate?: boolean;
}) {
  return (
    <ul
      className={`partner-marquee-group m-0 flex shrink-0 list-none items-center gap-12 p-0 pr-12 ${
        duplicate ? "partner-marquee-duplicate" : ""
      }`}
      aria-hidden={duplicate || undefined}
    >
      {items.map((item) => (
        <li
          key={item.name}
          className="flex shrink-0 items-center gap-3 whitespace-nowrap border-l-2 border-green pl-4"
        >
          <span className="text-[18px] font-black tracking-[-.015em] text-forest sm:text-[19px]">
            {item.name}
          </span>
          <span className="num text-[11px] font-semibold tracking-[.06em] text-muted">
            {item.district}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PartnerMarquee({
  items,
  locale,
  evidenceHref = "/zh-tw/evidence#partners",
  id,
}: {
  items: readonly PartnerStoreItem[];
  locale: keyof typeof COPY;
  evidenceHref?: string;
  id?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const copy = COPY[locale];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={sectionRef}
      className="partner-marquee scroll-mt-24 bg-ivory"
      data-paused={!visible}
      aria-labelledby={`partner-marquee-heading-${locale}`}
    >
      <div className="mx-auto max-w-[1240px] px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <h2 id={`partner-marquee-heading-${locale}`} className="m-0 text-[18px] font-black">
            <span className="num text-oxblood">{items.length}</span> {copy.headingSuffix}
          </h2>
          <Link
            href={evidenceHref}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-forest no-underline hover:text-green"
          >
            {copy.evidence}
          </Link>
        </div>

        <div
          className="partner-marquee-viewport relative mt-2 overflow-hidden py-4"
          aria-label={copy.ariaLabel}
        >
          <div className="partner-marquee-track flex w-max">
            <MarqueeList items={items} />
            <MarqueeList items={items} duplicate />
          </div>
          <span
            className="partner-marquee-edge pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-ivory to-transparent sm:w-12"
            aria-hidden
          />
          <span
            className="partner-marquee-edge pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-ivory to-transparent sm:w-12"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
