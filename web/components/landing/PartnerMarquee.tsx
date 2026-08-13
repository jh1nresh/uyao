"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PartnerStoreItem } from "@/lib/partner-stores";

const COPY = {
  zh: {
    headingSuffix: "家合作藥局據點",
    pause: "暫停移動",
    resume: "繼續移動",
    evidence: "查看合作與證據 →",
    ariaLabel: "合作藥局據點",
    notice: "合作不代表已安裝設備或已有即時庫存；其他公開收錄店家也不代表合作。",
  },
  en: {
    headingSuffix: "partner pharmacy locations",
    pause: "Pause movement",
    resume: "Resume movement",
    evidence: "Partnership evidence →",
    ariaLabel: "Partner pharmacy locations",
    notice:
      "Partnership does not imply installed hardware or live inventory; other public listings do not imply partnership.",
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
      className={`partner-marquee-group m-0 flex shrink-0 list-none items-center gap-10 p-0 pr-10 ${
        duplicate ? "partner-marquee-duplicate" : ""
      }`}
      aria-hidden={duplicate || undefined}
    >
      {items.map((item) => (
        <li key={item.name} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
          <span className="text-base font-bold text-ink">{item.name}</span>
          <span className="num text-xs font-medium text-muted">{item.district}</span>
          <span className="ml-8 text-oxblood" aria-hidden>
            ＋
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PartnerMarquee({
  items,
  locale,
}: {
  items: readonly PartnerStoreItem[];
  locale: keyof typeof COPY;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
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
      ref={sectionRef}
      className="partner-marquee border-b border-line bg-paper"
      data-paused={paused || !visible}
      aria-labelledby={`partner-marquee-heading-${locale}`}
    >
      <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <h2 id={`partner-marquee-heading-${locale}`} className="m-0 text-[17px] font-black">
            <span className="num text-oxblood">{items.length}</span> {copy.headingSuffix}
          </h2>
          <div className="flex items-center gap-5 text-xs font-semibold">
            <button
              type="button"
              className="partner-marquee-control inline-flex min-h-11 items-center border-0 bg-transparent p-0 text-muted underline decoration-line-strong underline-offset-4 hover:text-forest"
              aria-pressed={paused}
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? copy.resume : copy.pause}
            </button>
            <Link
              href="/zh-tw/evidence#partners"
              className="inline-flex min-h-11 items-center text-forest no-underline hover:text-green"
            >
              {copy.evidence}
            </Link>
          </div>
        </div>

        <div
          className="partner-marquee-viewport mt-2 overflow-hidden border-y border-line-strong py-4"
          aria-label={copy.ariaLabel}
        >
          <div className="partner-marquee-track flex w-max">
            <MarqueeList items={items} />
            <MarqueeList items={items} duplicate />
          </div>
        </div>

        <p className="mb-0 mt-2 text-xs leading-5 text-muted">{copy.notice}</p>
      </div>
    </section>
  );
}
