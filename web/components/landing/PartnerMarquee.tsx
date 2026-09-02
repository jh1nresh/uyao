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
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap border-l border-[#a98a61]/70 pl-4"
        >
          <span className="text-[15px] font-bold tracking-[-.01em] text-[#f8f4e9] sm:text-[16px]">
            {item.name}
          </span>
          <span className="num text-[11.5px] font-semibold tracking-[.04em] text-[#d5c4a7]">
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
      className="partner-marquee cabinet-partner-marquee scroll-mt-24"
      data-paused={!visible}
      aria-labelledby={`partner-marquee-heading-${locale}`}
    >
      <div className="mx-auto max-w-[1320px] px-5 pb-3 pt-5 sm:px-8 sm:pb-4 sm:pt-6">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <h2
            id={`partner-marquee-heading-${locale}`}
            className="m-0 whitespace-nowrap text-[14px] font-bold tracking-[.01em] text-[#f8f4e9] sm:text-[15px]"
          >
            <span className="num text-[#e5aaa0]">{items.length}</span> {copy.headingSuffix}
          </h2>

          <div
            className="partner-marquee-viewport relative col-span-2 row-start-2 mt-2 overflow-hidden py-1.5 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mt-0"
            aria-label={copy.ariaLabel}
          >
            <div className="partner-marquee-track flex w-max">
              <MarqueeList items={items} />
              <MarqueeList items={items} duplicate />
            </div>
            <span
              className="partner-marquee-edge cabinet-marquee-edge-left pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12"
              aria-hidden
            />
            <span
              className="partner-marquee-edge cabinet-marquee-edge-right pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12"
              aria-hidden
            />
          </div>

          <Link
            href={evidenceHref}
            className="inline-flex min-h-11 items-center whitespace-nowrap text-[11.5px] font-semibold text-[#e8dcc4] no-underline hover:text-white"
          >
            {copy.evidence}
          </Link>
        </div>
      </div>
    </section>
  );
}
