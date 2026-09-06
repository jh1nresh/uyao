import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PharmacyDirectoryLinks,
  pharmacyRecordHref,
} from "@/components/PharmacyDirectoryLinks";
import { allStores } from "./data";

const ROOT = join(import.meta.dirname, "..");
const COMPONENT_SOURCE = readFileSync(
  join(ROOT, "components", "PharmacyDirectoryLinks.tsx"),
  "utf8",
);
const HOME_SOURCE = readFileSync(
  join(ROOT, "app", "(consumer)", "app", "page.tsx"),
  "utf8",
);
const GUIDE_SOURCE = readFileSync(
  join(ROOT, "app", "guides", "find-medicine-nearby", "page.tsx"),
  "utf8",
);
const MARQUEE_SOURCE = readFileSync(
  join(ROOT, "components", "landing", "PartnerMarquee.tsx"),
  "utf8",
);

function renderDirectory(locale: "zh" | "en"): string {
  return renderToStaticMarkup(
    createElement(PharmacyDirectoryLinks, { locale }),
  );
}

function visibleAnchors(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].flatMap((match) => {
    const attrs = match[1];
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
    if (!href) return [];
    if (/\baria-hidden(?:=(?:"true"|true))?\b/.test(attrs)) return [];
    const text = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return [{ href, text }];
  });
}

describe("pharmacy directory links", () => {
  it("is a server component with one visible canonical link per store", () => {
    expect(COMPONENT_SOURCE).not.toContain("use client");
    expect(COMPONENT_SOURCE).not.toMatch(/\buse(State|Effect|Ref)\b/);
    expect(COMPONENT_SOURCE).toContain('from "next/link"');

    const stores = allStores();
    expect(stores).toHaveLength(16);

    for (const locale of ["zh", "en"] as const) {
      const html = renderDirectory(locale);
      expect(html).not.toContain("<script");
      expect(html).not.toMatch(/javascript:/i);

      const anchors = visibleAnchors(html);
      expect(anchors, locale).toHaveLength(stores.length);
      expect(new Set(anchors.map((anchor) => anchor.href)).size).toBe(stores.length);

      const hrefByDecodedPath = new Map(
        anchors.map((anchor) => [decodeURIComponent(anchor.href), anchor]),
      );

      for (const store of stores) {
        const href = pharmacyRecordHref(store.slug);
        expect(href).toBe(`/zh-tw/store/${encodeURIComponent(store.slug)}`);
        expect(href).toContain("%");
        expect(href).not.toContain("?");
        expect(html).toContain(`href="${href}"`);

        const decoded = decodeURIComponent(href);
        expect(decoded).toBe(`/zh-tw/store/${store.slug}`);
        expect(hrefByDecodedPath.has(decoded)).toBe(true);
        expect(hrefByDecodedPath.get(decoded)?.text).toContain(store.name);
      }

      expect(html).not.toContain("/en/store/");
      expect(html).not.toContain("?area=");
    }
  });

  it("groups the listed records by their actual area without claiming completeness", () => {
    const zh = renderDirectory("zh");
    const en = renderDirectory("en");

    expect(zh).toContain("目前收錄的 16 家藥局公開資料");
    expect(zh).not.toContain("每區所有藥局");
    expect(zh).not.toContain("全部藥局");
    expect(zh).toContain("公開收錄不代表即時庫存，也不代表已與 uYao 合作。");
    expect(zh).toContain("臺北市大同區");
    expect(zh).toContain("新北市新莊區");
    expect(zh).toContain("建利西藥房");
    expect(zh).toContain("大同區");

    expect(en).toContain("16 pharmacy records currently listed on uYao");
    expect(en).toContain("A public listing is not live stock and is not proof of a uYao partnership.");
    expect(en).toContain("Pharmacy names stay in Chinese as recorded.");
    expect(en).toContain("臺北市大同區");
    expect(en).toContain("臺北市士林區");
    expect(en).toContain("建利西藥房");
    expect(en).toContain("士林區");
    expect(en).not.toContain("Jianli Pharmacy");
    expect(en).not.toContain("every pharmacy in");
  });

  it("is mounted on the homepage and nearby guide without changing search or the marquee", () => {
    expect(HOME_SOURCE).toContain("<PharmacyDirectoryLinks");
    expect(HOME_SOURCE).toContain("<SearchInput");
    expect(HOME_SOURCE).toContain('resultsPath="/agent"');
    expect(HOME_SOURCE).toContain("<PartnerMarquee");
    expect(HOME_SOURCE.indexOf("<PharmacyDirectoryLinks")).toBeGreaterThan(
      HOME_SOURCE.indexOf("<PartnerMarquee"),
    );
    expect(HOME_SOURCE.indexOf("<PharmacyDirectoryLinks")).toBeLessThan(
      HOME_SOURCE.indexOf("<SiteFooter"),
    );

    expect(GUIDE_SOURCE).toContain("<PharmacyDirectoryLinks");
    expect(GUIDE_SOURCE).toContain("{copy.directAnswer}");
    expect(GUIDE_SOURCE).toContain("content.faq.slice(1)");
    expect(GUIDE_SOURCE).toContain("未經藥師專業審閱");
    expect(GUIDE_SOURCE).toContain("Not reviewed by a licensed pharmacist");

    expect(MARQUEE_SOURCE).not.toContain("/store/");
    expect(MARQUEE_SOURCE).toContain("<span className=\"text-[15px] font-bold");
  });
});
