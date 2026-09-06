import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { allStores, getArea, getStore } from "./data";
import type { Locale } from "./i18n";
import { BRAND_NAME, BRAND_SHORT_NAME, SHOP_CANONICAL_HOST } from "./seo";
import { SHOP_URL } from "./shop";
import { storePageMetadata, storeSearchTitle } from "./store-seo";
import type { Store } from "./types";

let localeHeader = "zh";
let host = SHOP_CANONICAL_HOST;
let vercelEnv: string | undefined;

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      host,
      "x-uyao-locale": localeHeader,
    }),
}));

const { generateMetadata } = await import("../app/(consumer)/store/[slug]/page");

const INDEXABLE_ADMISSION = { index: true, follow: true } as const;
const PREVIEW_ADMISSION = { index: false, follow: false } as const;

function store(slug: string): Store {
  const found = getStore(slug);
  expect(found, slug).toBeDefined();
  return found as Store;
}

function zhTitle(record: Store): string {
  return storeSearchTitle(record, "zh");
}

async function routeMetadata(slug: string, locale: Locale) {
  localeHeader = locale === "en" ? "en" : "zh";
  return generateMetadata({ params: Promise.resolve({ slug }) });
}

describe("store search titles", () => {
  it("puts pharmacy and city/district before contact intent for a normal record", () => {
    const jianli = store("建利西藥房");
    const metadata = storePageMetadata(jianli, "zh", INDEXABLE_ADMISSION);

    expect(getArea(jianli.area).name).toBe("臺北市大同區");
    expect(jianli.phone).toBeTruthy();
    expect(metadata.title).toBe("建利西藥房｜臺北市大同區地址與電話");
    expect(metadata.title).toBe(zhTitle(jianli));
    expect(String(metadata.title).startsWith(jianli.name)).toBe(true);
  });

  it("does not promise a phone when the public record has none", () => {
    const tianyang = store("天養藥局");
    const metadata = storePageMetadata(tianyang, "zh", INDEXABLE_ADMISSION);

    expect(tianyang.phone).toBe("");
    expect(getArea(tianyang.area).name).toBe("臺北市士林區");
    expect(metadata.title).toBe("天養藥局｜臺北市士林區地址與地圖");
    expect(String(metadata.title)).not.toContain("電話");
  });

  it("preserves a long store.name exactly and still uses getArea().name", () => {
    const jianli = store("建利西藥房");
    const longName =
      "建利西藥房長名稱測試用超級長的藥局名稱確認標題完整保留不截斷不改寫";
    const longStore = { ...jianli, name: longName };
    const metadata = storePageMetadata(longStore, "zh", INDEXABLE_ADMISSION);

    expect(longName.length).toBeGreaterThan(jianli.name.length);
    expect(metadata.title).toBe(`${longName}｜臺北市大同區地址與電話`);
    expect(String(metadata.title).startsWith(longName)).toBe(true);
    expect(String(metadata.title)).toContain(getArea(jianli.area).name);
  });

  it("gives every current Chinese store accurate geography and truthful contact intent", () => {
    const titles = allStores().map((record) => {
      const metadata = storePageMetadata(record, "zh", INDEXABLE_ADMISSION);
      const title = String(metadata.title);
      const areaName = getArea(record.area).name;
      const intent = record.phone ? "地址與電話" : "地址與地圖";

      expect(title).toBe(`${record.name}｜${areaName}${intent}`);
      expect(title.startsWith(record.name)).toBe(true);
      expect(title).toContain(areaName);
      expect(title).toContain(intent);
      expect(title).not.toContain("公開藥局資料");
      expect(title).not.toContain(BRAND_NAME);
      expect(title).not.toContain(BRAND_SHORT_NAME);
      expect(title).not.toMatch(/營業時間|庫存|有貨|現貨|供應|hours|stock|available/i);
      return title;
    });

    expect(titles).toContain("建利西藥房｜臺北市大同區地址與電話");
    expect(titles).toContain("天養藥局｜臺北市士林區地址與地圖");
    expect(new Set(titles).size).toBe(allStores().length);
  });
});

describe("store page metadata contract", () => {
  it("keeps English on the current public-record title and canonicalizes to zh-tw", () => {
    const jianli = store("建利西藥房");
    const metadata = storePageMetadata(jianli, "en", INDEXABLE_ADMISSION);
    const canonical = `${SHOP_URL}/zh-tw/store/${jianli.slug}`;

    expect(metadata.title).toBe("建利西藥房 — public pharmacy record");
    expect(metadata.title).toBe(storeSearchTitle(jianli, "en"));
    expect(metadata.alternates).toEqual({
      canonical,
      languages: {
        "zh-TW": canonical,
        "x-default": canonical,
      },
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.description).toBe(
      `${jianli.name}, ${jianli.address}. This public listing does not mean a uYao partnership or live inventory; call the pharmacy to confirm before visiting.`,
    );
  });

  it("preserves Chinese description, canonical, and admission robots", () => {
    const jianli = store("建利西藥房");
    const metadata = storePageMetadata(jianli, "zh", INDEXABLE_ADMISSION);
    const canonical = `${SHOP_URL}/zh-tw/store/${jianli.slug}`;

    expect(metadata.description).toBe(
      `${jianli.name}，${jianli.address}。公開收錄不代表 uYao 合作或已有即時庫存；前往門市前請先向藥局確認。`,
    );
    expect(metadata.alternates).toEqual({
      canonical,
      languages: {
        "zh-TW": canonical,
        "x-default": canonical,
      },
    });
    expect(metadata.robots).toEqual(INDEXABLE_ADMISSION);
    expect(storePageMetadata(jianli, "zh", PREVIEW_ADMISSION).robots).toEqual(
      PREVIEW_ADMISSION,
    );
  });

  it("keeps not-found titles and noindex", () => {
    expect(storePageMetadata(undefined, "zh", INDEXABLE_ADMISSION)).toEqual({
      title: "找不到這家藥局",
      robots: { index: false, follow: false },
    });
    expect(storePageMetadata(undefined, "en", INDEXABLE_ADMISSION)).toEqual({
      title: "Pharmacy not found",
      robots: { index: false, follow: false },
    });
  });
});

describe("generateMetadata on the store route", () => {
  beforeEach(() => {
    vercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    host = SHOP_CANONICAL_HOST;
    localeHeader = "zh";
  });

  afterEach(() => {
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = vercelEnv;
  });

  it("returns the helper metadata for a live Chinese store", async () => {
    const jianli = store("建利西藥房");
    const metadata = await routeMetadata(jianli.slug, "zh");
    expect(metadata).toEqual(
      storePageMetadata(jianli, "zh", INDEXABLE_ADMISSION),
    );
    expect(metadata.title).toBe("建利西藥房｜臺北市大同區地址與電話");
  });

  it("returns the no-phone title for 天養藥局", async () => {
    const metadata = await routeMetadata("天養藥局", "zh");
    expect(metadata.title).toBe("天養藥局｜臺北市士林區地址與地圖");
    expect(metadata.robots).toEqual(INDEXABLE_ADMISSION);
  });

  it("keeps English noindex and the Chinese canonical even when admission would index", async () => {
    const jianli = store("建利西藥房");
    const metadata = await routeMetadata(jianli.slug, "en");
    expect(metadata).toEqual(
      storePageMetadata(jianli, "en", INDEXABLE_ADMISSION),
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      `${SHOP_URL}/zh-tw/store/${jianli.slug}`,
    );
  });

  it("keeps not-found noindex,nofollow from the route", async () => {
    expect(await routeMetadata("no-such-pharmacy", "zh")).toEqual({
      title: "找不到這家藥局",
      robots: { index: false, follow: false },
    });
  });
});
